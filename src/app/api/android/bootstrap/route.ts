import { NextResponse } from "next/server";
import { getApiUserFromRequest, unauthorized } from "@/lib/auth-server";
import { createUserDb } from "@/lib/user-db";
import { brl } from "@/lib/format";

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
      .select("id, account_id, description, amount, posted_at, type, app_category, is_consolidated, raw")
      .eq("profile_id", user.id)
      .order("posted_at", { ascending: false })
      .limit(80),
  ]);

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
    required_setup: {
      full_name: !String(profile?.full_name || "").trim(),
      notification_listener: true,
    },
  });
}
