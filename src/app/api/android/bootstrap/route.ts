import { NextResponse } from "next/server";
import { getApiUserFromRequest, unauthorized } from "@/lib/auth-server";
import { createUserDb } from "@/lib/user-db";
import { brl } from "@/lib/format";
import { ROOT_CATEGORY_NAME } from "@/lib/category-catalog";

function relationMissing(error: any) {
  const message = String(error?.message || "");
  const code = String(error?.code || "");
  return code === "PGRST205" || /relation .*categories.* does not exist/i.test(message);
}

export async function GET(req: Request) {
  const user = await getApiUserFromRequest(req);
  if (!user) return unauthorized();

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const supabase = createUserDb(token);

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [{ data: profile }, { data: banks }, { data: accounts }, { data: transactions }] = await Promise.all([
    supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle(),
    supabase.from("banks").select("id, name, code").eq("profile_id", user.id).order("name"),
    supabase
      .from("accounts")
      .select("id, bank_id, name, type, balance, institution_name, last_balance_at")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("transactions")
      .select("id, account_id, description, amount, posted_at, type, app_category, is_consolidated, installment_current, installment_total, installment_group_key, raw")
      .eq("profile_id", user.id)
      .order("posted_at", { ascending: false })
      .limit(2000),
  ]);

  const { data: categoryRows, error: categoryError } = await supabase
    .from("categories")
    .select("id, name, parent_id")
    .eq("profile_id", user.id)
    .order("name");

  let categories = categoryRows || [];
  if (categoryError && !relationMissing(categoryError)) throw categoryError;
  if (categoryError && relationMissing(categoryError)) categories = [];

  const categoryNames = new Set<string>([ROOT_CATEGORY_NAME, "Outros", "Transferências"]);
  for (const tx of transactions || []) {
    const category = String((tx as any).app_category || "").trim();
    if (category) categoryNames.add(category);
  }
  for (const category of categories || []) {
    const name = String((category as any).name || "").trim();
    if (name) categoryNames.add(name);
  }

  const accountBalances = new Map<string, number>();
  for (const tx of transactions || []) {
    const accountId = String((tx as any).account_id || "");
    if (!accountId) continue;
    accountBalances.set(accountId, (accountBalances.get(accountId) || 0) + Number((tx as any).amount || 0));
  }

  const monthRows = (transactions || []).filter((tx: any) => {
    const postedAt = new Date(tx.posted_at || 0);
    return postedAt >= monthStart;
  });
  const monthIncome = monthRows
    .filter((tx: any) => tx.type === "credit")
    .reduce((sum: number, tx: any) => sum + Math.abs(Number(tx.amount || 0)), 0);
  const monthExpense = monthRows
    .filter((tx: any) => tx.type === "debit")
    .reduce((sum: number, tx: any) => sum + Math.abs(Number(tx.amount || 0)), 0);
  const totalBalance = Array.from(accountBalances.values()).reduce((sum, value) => sum + value, 0);

  return NextResponse.json({
    ok: true,
    profile: {
      id: user.id,
      email: profile?.email || user.email || "",
      full_name: profile?.full_name || user.user_metadata?.full_name || "",
    },
    summary: {
      balance: totalBalance,
      balance_label: brl(totalBalance),
      month_income: monthIncome,
      month_expense: monthExpense,
    },
    banks: banks || [],
    accounts: (accounts || []).map((account: any) => ({
      ...account,
      computed_balance: accountBalances.get(String(account.id)) || Number(account.balance || 0),
    })),
    transactions: transactions || [],
    categories: Array.from(categoryNames)
      .sort((a, b) => a.localeCompare(b, "pt-BR"))
      .map((name) => ({ name })),
    required_setup: {
      full_name: !String(profile?.full_name || "").trim(),
      notification_listener: true,
    },
  });
}
