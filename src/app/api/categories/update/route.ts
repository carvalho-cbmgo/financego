import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getApiUserFromCookiesOrRequest, unauthorized } from "@/lib/auth-server";

function typeFromAction(action: string) {
  const normalized = action.trim().toLowerCase();

  if (normalized === "receita" || normalized === "credit") return "credit";
  if (normalized === "transferencia" || normalized === "transferência" || normalized === "transfer") return "transfer";

  // Regra de fallback: na duvida, classifica como despesa.
  return "debit";
}

function safeReturnUrl(input: string) {
  if (input.startsWith("/dashboard")) return input;
  return "/dashboard?tab=transactions";
}

export async function POST(req: Request) {
  const user = await getApiUserFromCookiesOrRequest(req);
  if (!user) return unauthorized();

  const form = await req.formData();
  const id = String(form.get("id") || "");
  const category = String(form.get("category") || "");
  const subcategory = String(form.get("subcategory") || "");
  const action = String(form.get("action") || "");
  const accountId = String(form.get("account_id") || "").trim();
  const returnUrl = safeReturnUrl(String(form.get("return_url") || ""));
  const isConsolidated = form.has("is_consolidated");
  const txType = typeFromAction(action);

  if (!id) {
    return NextResponse.redirect(new URL(returnUrl, req.url));
  }

  if (!accountId) {
    return NextResponse.redirect(new URL("/dashboard?tab=transactions&error=account_required", req.url));
  }

  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("id")
    .eq("id", accountId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!account?.id) {
    return NextResponse.redirect(new URL("/dashboard?tab=transactions&error=invalid_account", req.url));
  }

  await supabaseAdmin
    .from("transactions")
    .update({
      app_category: category,
      app_subcategory: subcategory,
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
