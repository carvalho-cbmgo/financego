import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getApiUserFromCookiesOrRequest, unauthorized } from "@/lib/auth-server";
import { bankKeyFromBankName } from "@/lib/accounts";

function parseAction(input: string) {
  const normalized = input.trim().toLowerCase();
  if (normalized === "receita") return "credit" as const;
  if (normalized === "transferencia" || normalized === "transferência" || normalized === "transfer") return "transfer" as const;
  return "debit" as const;
}

function computeAmountByAction(type: "credit" | "debit" | "transfer", inputAmount: number) {
  if (type === "credit") return Math.abs(inputAmount);
  if (type === "debit") return -Math.abs(inputAmount);
  return inputAmount;
}

function withError(url: string, code: string) {
  return url.includes("?") ? `${url}&error=${code}` : `${url}?error=${code}`;
}

function safeReturnUrl(input: string) {
  if (input.startsWith("/dashboard")) return input;
  return "/dashboard?tab=transactions";
}

export async function POST(req: Request) {
  const user = await getApiUserFromCookiesOrRequest(req);
  if (!user) return unauthorized();

  const form = await req.formData();
  const returnUrl = safeReturnUrl(String(form.get("return_url") || "/dashboard?tab=transactions"));
  const accountId = String(form.get("account_id") || "").trim();
  const description = String(form.get("description") || "").trim();
  const postedAtDate = String(form.get("posted_at") || "").trim();
  const category = String(form.get("category") || "").trim() || "Outros";
  const action = String(form.get("action") || "Despesa");
  const type = parseAction(action);
  const inputAmount = Number(form.get("amount") || 0);
  const isConsolidated = form.has("is_consolidated");

  if (!accountId || !description || !postedAtDate || !Number.isFinite(inputAmount) || inputAmount === 0) {
    return NextResponse.redirect(new URL(withError(returnUrl, "invalid_transaction"), req.url));
  }

  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("id, institution_name, bank_id")
    .eq("id", accountId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!account?.id) {
    return NextResponse.redirect(new URL(withError(returnUrl, "invalid_account"), req.url));
  }

  const { data: bank } = account.bank_id
    ? await supabaseAdmin
      .from("banks")
      .select("name")
      .eq("id", account.bank_id)
      .eq("profile_id", user.id)
      .maybeSingle()
    : { data: null as any };

  const bankName = String(bank?.name || account.institution_name || "GENERICO");
  const amount = computeAmountByAction(type, inputAmount);
  const postedAt = `${postedAtDate}T12:00:00.000Z`;
  const bankKey = bankKeyFromBankName(bankName);

  await supabaseAdmin.from("transactions").insert({
    profile_id: user.id,
    account_id: accountId,
    bank_key: bankKey,
    description,
    amount,
    currency_code: "BRL",
    posted_at: postedAt,
    status: isConsolidated ? "posted" : "planned",
    type,
    source_category: "manual",
    app_category: category,
    app_subcategory: null,
    is_transfer: type === "transfer",
    is_consolidated: isConsolidated,
    raw: { source: "manual_form" },
  });

  return NextResponse.redirect(new URL(returnUrl, req.url));
}
