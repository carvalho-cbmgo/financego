import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getApiUserFromCookiesOrRequest, unauthorized } from "@/lib/auth-server";
import { ensureBankByName } from "@/lib/accounts";

export async function POST(req: Request) {
  const user = await getApiUserFromCookiesOrRequest(req);
  if (!user) return unauthorized();

  const form = await req.formData();
  const bankName = String(form.get("bank_name") || "").trim();
  const bankCode = String(form.get("bank_code") || "").trim();

  if (!bankName) {
    return NextResponse.redirect(new URL("/accounts?error=missing_bank_name", req.url));
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
