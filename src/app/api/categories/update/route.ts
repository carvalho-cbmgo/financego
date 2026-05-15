import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getApiUserFromCookiesOrRequest, unauthorized } from "@/lib/auth-server";
import { bankKeyFromBankName } from "@/lib/accounts";

function typeFromAction(action: string) {
  const normalized = action.trim().toLowerCase();

  if (normalized === "receita" || normalized === "credit") return "credit" as const;
  if (normalized === "transferencia" || normalized === "transferência" || normalized === "transfer") return "transfer" as const;

  return "debit" as const;
}

function computeAmountByAction(type: "credit" | "debit" | "transfer", inputAmount: number) {
  if (type === "credit") return Math.abs(inputAmount);
  if (type === "debit") return -Math.abs(inputAmount);
  return inputAmount;
}

function safeReturnUrl(input: string) {
  if (input.startsWith("/dashboard")) return input;
  return "/dashboard?tab=transactions";
}

export async function POST(req: Request) {
  const user = await getApiUserFromCookiesOrRequest(req);
  if (!user) return unauthorized();

  const form = await req.formData();
  const id = String(form.get("id") || "").trim();
  const category = String(form.get("category") || "Outros").trim() || "Outros";
  const description = String(form.get("description") || "").trim();
  const postedAtDate = String(form.get("posted_at") || "").trim();
  const bankId = String(form.get("bank_id") || "").trim();
  const action = String(form.get("action") || "");
  const accountId = String(form.get("account_id") || "").trim();
  const inputAmount = Number(form.get("amount") || 0);
  const returnUrl = safeReturnUrl(String(form.get("return_url") || ""));
  const isConsolidated = form.has("is_consolidated");
  const txType = typeFromAction(action);
  const amount = computeAmountByAction(txType, inputAmount);

  if (!id) {
    return NextResponse.redirect(new URL(returnUrl, req.url));
  }

  if (!accountId || !description || !postedAtDate || !Number.isFinite(inputAmount) || inputAmount === 0) {
    return NextResponse.redirect(new URL("/dashboard?tab=transactions&error=invalid_transaction", req.url));
  }

  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("id, bank_id, institution_name")
    .eq("id", accountId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!account?.id) {
    return NextResponse.redirect(new URL("/dashboard?tab=transactions&error=invalid_account", req.url));
  }

  if (bankId && String(account.bank_id || "") !== bankId) {
    return NextResponse.redirect(new URL("/dashboard?tab=transactions&error=bank_account_mismatch", req.url));
  }

  const { data: bank } = account.bank_id
    ? await supabaseAdmin
      .from("banks")
      .select("name")
      .eq("id", account.bank_id)
      .eq("profile_id", user.id)
      .maybeSingle()
    : { data: null as any };

  const postedAt = `${postedAtDate}T12:00:00.000Z`;
  const bankName = String(bank?.name || account.institution_name || "GENERICO");
  const bankKey = bankKeyFromBankName(bankName);

  await supabaseAdmin
    .from("transactions")
    .update({
      description,
      posted_at: postedAt,
      bank_key: bankKey,
      amount,
      app_category: category,
      app_subcategory: null,
      type: txType,
      is_transfer: txType === "transfer",
      account_id: accountId,
      is_consolidated: isConsolidated,
      status: isConsolidated ? "posted" : "planned",
    })
    .eq("id", id)
    .eq("profile_id", user.id);

  return NextResponse.redirect(new URL(returnUrl, req.url));
}
