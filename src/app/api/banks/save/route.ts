import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getApiUserFromCookiesOrRequest, unauthorized } from "@/lib/auth-server";
import { ensureBankByName } from "@/lib/accounts";

export async function POST(req: Request) {
  const user = await getApiUserFromCookiesOrRequest(req);
  if (!user) return unauthorized();

  const form = await req.formData();
  const bankId = String(form.get("id") || form.get("bank_id") || "").trim();
  const bankName = String(form.get("bank_name") || "").trim();
  const bankCode = String(form.get("bank_code") || "").trim();

  if (!bankName) {
    return NextResponse.redirect(new URL("/accounts?error=missing_bank_name", req.url));
  }

  if (bankId) {
    const { data: existing } = await supabaseAdmin
      .from("banks")
      .select("id")
      .eq("id", bankId)
      .eq("profile_id", user.id)
      .maybeSingle();

    if (!existing?.id) {
      return NextResponse.redirect(new URL("/accounts?error=bank_not_found", req.url));
    }

    await supabaseAdmin
      .from("banks")
      .update({
        name: bankName,
        code: bankCode || null,
      })
      .eq("id", bankId)
      .eq("profile_id", user.id);

    return NextResponse.redirect(new URL("/accounts?ok=bank_updated", req.url));
  }

  const bank = await ensureBankByName(user.id, bankName);

  if (bankCode) {
    await supabaseAdmin
      .from("banks")
      .update({ code: bankCode })
      .eq("id", bank.id)
      .eq("profile_id", user.id);
  }

  return NextResponse.redirect(new URL("/accounts?ok=bank_saved", req.url));
}
