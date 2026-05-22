import { NextResponse } from "next/server";
import { ensureBankByName } from "@/lib/accounts";
import { getApiUserFromRequest, unauthorized } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  const user = await getApiUserFromRequest(req);
  if (!user) return unauthorized();

  const body = await req.json();
  const id = String(body.id || body.bank_id || "").trim();
  const bankName = String(body.bank_name || body.name || "").replace(/\s+/g, " ").trim();
  const bankCode = String(body.bank_code || body.code || "").replace(/\s+/g, " ").trim();

  if (!bankName) {
    return NextResponse.json({ error: "Informe o nome do banco." }, { status: 400 });
  }

  if (id) {
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("banks")
      .select("id")
      .eq("id", id)
      .eq("profile_id", user.id)
      .maybeSingle();

    if (existingError) throw existingError;
    if (!existing?.id) return NextResponse.json({ error: "Banco não encontrado." }, { status: 404 });

    const { data, error } = await supabaseAdmin
      .from("banks")
      .update({ name: bankName, code: bankCode || null })
      .eq("id", id)
      .eq("profile_id", user.id)
      .select("id")
      .single();

    if (error) throw error;

    await supabaseAdmin
      .from("accounts")
      .update({ institution_name: bankName })
      .eq("profile_id", user.id)
      .eq("bank_id", id);

    return NextResponse.json({ ok: true, id: data?.id });
  }

  const bank = await ensureBankByName(user.id, bankName);
  if (bankCode) {
    await supabaseAdmin
      .from("banks")
      .update({ code: bankCode })
      .eq("id", bank.id)
      .eq("profile_id", user.id);
  }

  return NextResponse.json({ ok: true, id: bank.id });
}
