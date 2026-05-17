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
  const accountId = String(form.get("id") || "").trim();
  const returnUrl = safeReturnUrl(String(form.get("return_url") || "/accounts"));

  if (!accountId) {
    return NextResponse.redirect(new URL("/accounts?error=missing_account", req.url));
  }

  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("id")
    .eq("id", accountId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!account?.id) {
    return NextResponse.redirect(new URL("/accounts?error=account_not_found", req.url));
  }

  const { error } = await supabaseAdmin
    .from("accounts")
    .delete()
    .eq("id", accountId)
    .eq("profile_id", user.id);

  if (error) {
    return NextResponse.redirect(new URL("/accounts?error=delete_failed", req.url));
  }

  const okUrl = returnUrl.includes("?")
    ? `${returnUrl}&ok=account_deleted`
    : `${returnUrl}?ok=account_deleted`;
  return NextResponse.redirect(new URL(okUrl, req.url));
}
