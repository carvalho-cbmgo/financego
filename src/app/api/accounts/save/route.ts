import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getApiUserFromCookiesOrRequest, unauthorized } from "@/lib/auth-server";
import { parseAccountType } from "@/lib/accounts";

export async function POST(req: Request) {
  const user = await getApiUserFromCookiesOrRequest(req);
  if (!user) return unauthorized();

  const form = await req.formData();
  const accountId = String(form.get("id") || "");
  const bankName = String(form.get("bank_name") || "").trim();
  const accountName = String(form.get("account_name") || "").trim();
  const accountType = parseAccountType(String(form.get("account_type") || ""));
  const balance = Number(form.get("balance") || 0);

  if (!bankName || !accountName) {
    return NextResponse.redirect(new URL("/accounts?error=missing_fields", req.url));
  }

  const payload = {
    profile_id: user.id,
    institution_name: bankName,
    name: accountName,
    type: accountType,
    subtype: accountType,
    currency_code: "BRL",
    balance: Number.isFinite(balance) ? balance : 0,
  };

  if (accountId) {
    await supabaseAdmin.from("accounts").update(payload).eq("id", accountId).eq("profile_id", user.id);
  } else {
    await supabaseAdmin.from("accounts").insert(payload);
  }

  return NextResponse.redirect(new URL("/accounts?ok=1", req.url));
}
