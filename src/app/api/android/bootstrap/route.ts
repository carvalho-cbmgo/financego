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

function normalizedTransactionAmount(tx: any) {
  const amount = Number(tx?.amount || 0);
  const type = String(tx?.type || "").toLowerCase();
  if (type === "debit") return -Math.abs(amount);
  if (type === "credit") return Math.abs(amount);
  if (type === "transfer") return amount;
  return amount;
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
  for (const account of accounts || []) {
    const accountId = String((account as any).id || "");
    if (!accountId) continue;
    accountBalances.set(accountId, Number((account as any).balance || 0));
  }
  for (const tx of transactions || []) {
    const accountId = String((tx as any).account_id || "");
    if (!accountId) continue;
    accountBalances.set(accountId, (accountBalances.get(accountId) || 0) + normalizedTransactionAmount(tx));
  }

  const monthRows = (transactions || []).filter((tx: any) => {
    const postedAt = new Date(tx.posted_at || 0);
    return postedAt >= monthStart;
  });
  const monthIncome = monthRows
    .filter((tx: any) => tx.type === "credit")
    .reduce((sum: number, tx: any) => sum + Math.abs(normalizedTransactionAmount(tx)), 0);
  const monthExpense = monthRows
    .filter((tx: any) => tx.type === "debit")
    .reduce((sum: number, tx: any) => sum + Math.abs(normalizedTransactionAmount(tx)), 0);
  const totalBalance = Array.from(accountBalances.values()).reduce((sum, value) => sum + value, 0);

  const categoryById = new Map<string, any>();
  for (const category of categories || []) {
    if ((category as any)?.id) categoryById.set(String((category as any).id), category);
  }

  const childrenByParent = new Map<string, string[]>();
  const addChild = (parentName: string, childName: string) => {
    if (!childName || childName === ROOT_CATEGORY_NAME) return;
    if (!childrenByParent.has(parentName)) childrenByParent.set(parentName, []);
    const children = childrenByParent.get(parentName)!;
    if (!children.includes(childName)) children.push(childName);
  };

  for (const name of categoryNames) {
    addChild(ROOT_CATEGORY_NAME, name);
  }

  for (const category of categories || []) {
    const name = String((category as any).name || "").trim();
    if (!name || name === ROOT_CATEGORY_NAME) continue;
    const parent = categoryById.get(String((category as any).parent_id || ""));
    const parentName = String(parent?.name || ROOT_CATEGORY_NAME).trim() || ROOT_CATEGORY_NAME;
    const effectiveParent = parentName === ROOT_CATEGORY_NAME ? ROOT_CATEGORY_NAME : parentName;
    if (effectiveParent !== ROOT_CATEGORY_NAME) {
      const rootChildren = childrenByParent.get(ROOT_CATEGORY_NAME) || [];
      childrenByParent.set(ROOT_CATEGORY_NAME, rootChildren.filter((child) => child !== name));
    }
    addChild(effectiveParent, name);
  }

  const visitedCategories = new Set<string>();
  const categoryPayload: Array<{ name: string; parent_name: string; depth: number }> = [];
  function walkCategories(parentName: string, depth: number) {
    const children = (childrenByParent.get(parentName) || [])
      .filter((name, index, arr) => arr.indexOf(name) === index)
      .sort((a, b) => a.localeCompare(b, "pt-BR"));
    for (const child of children) {
      if (child === ROOT_CATEGORY_NAME || visitedCategories.has(child)) continue;
      visitedCategories.add(child);
      categoryPayload.push({ name: child, parent_name: parentName, depth });
      walkCategories(child, depth + 1);
    }
  }
  walkCategories(ROOT_CATEGORY_NAME, 0);
  for (const name of Array.from(categoryNames).sort((a, b) => a.localeCompare(b, "pt-BR"))) {
    if (name !== ROOT_CATEGORY_NAME && !visitedCategories.has(name)) {
      categoryPayload.push({ name, parent_name: ROOT_CATEGORY_NAME, depth: 0 });
    }
  }

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
      computed_balance: accountBalances.get(String(account.id)) || 0,
    })),
    transactions: transactions || [],
    categories: categoryPayload,
    required_setup: {
      full_name: !String(profile?.full_name || "").trim(),
      notification_listener: true,
    },
  });
}
