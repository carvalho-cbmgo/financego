import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getApiUserFromCookiesOrRequest, unauthorized } from "@/lib/auth-server";
import { parseAccountType } from "@/lib/accounts";

export async function POST(req: Request) {
  const user = await getApiUserFromCookiesOrRequest(req);
  if (!user) return unauthorized();

  const form = await req.formData();
  const accountId = String(form.get("id") || "");
  const bankId = String(form.get("bank_id") || "").trim();
  const accountName = String(form.get("account_name") || "").trim();
  const accountType = parseAccountType(String(form.get("account_type") || ""));
  const balance = Number(form.get("balance") || 0);

  if (!bankId || !accountName) {
    return NextResponse.redirect(new URL("/accounts?error=missing_fields", req.url));
  }

  const { data: bank } = await supabaseAdmin
    .from("banks")
    .select("id, name")
    .eq("id", bankId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!bank?.id) {
    return NextResponse.redirect(new URL("/accounts?error=invalid_bank", req.url));
  }

  const payload = {
    profile_id: user.id,
    bank_id: bank.id,
    institution_name: bank.name,
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
