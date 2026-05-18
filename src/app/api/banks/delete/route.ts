import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getApiUserFromCookiesOrRequest, unauthorized } from "@/lib/auth-server";

function safeReturnUrl(input: string) {
  return input.startsWith("/accounts") ? input : "/accounts";
}

export async function POST(req: Request) {
  const user = await getApiUserFromCookiesOrRequest(req);
  if (!user) return unauthorized();

  const form = await req.formData();
  const bankId = String(form.get("id") || "").trim();
  const returnUrl = safeReturnUrl(String(form.get("return_url") || "/accounts"));

  if (!bankId) {
    return NextResponse.redirect(new URL("/accounts?error=missing_bank", req.url));
  }

  const { data: bank } = await supabaseAdmin
    .from("banks")
    .select("id")
    .eq("id", bankId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!bank?.id) {
    return NextResponse.redirect(new URL("/accounts?error=bank_delete_not_found", req.url));
  }

  const { data: linkedAccount } = await supabaseAdmin
    .from("accounts")
    .select("id")
    .eq("profile_id", user.id)
    .eq("bank_id", bankId)
    .limit(1)
    .maybeSingle();

  if (linkedAccount?.id) {
    return NextResponse.redirect(new URL("/accounts?error=bank_has_accounts", req.url));
  }

  const { error } = await supabaseAdmin
    .from("banks")
    .delete()
    .eq("id", bankId)
    .eq("profile_id", user.id);

  if (error) {
    return NextResponse.redirect(new URL("/accounts?error=bank_delete_failed", req.url));
  }

  const okUrl = returnUrl.includes("?")
    ? `${returnUrl}&ok=bank_deleted`
    : `${returnUrl}?ok=bank_deleted`;
  return NextResponse.redirect(new URL(okUrl, req.url));
}
