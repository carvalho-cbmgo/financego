import { NextResponse } from "next/server";
import { getApiUserFromRequest, unauthorized } from "@/lib/auth-server";
import { parseAccountType } from "@/lib/accounts";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  const user = await getApiUserFromRequest(req);
  if (!user) return unauthorized();

  const body = await req.json();
  const id = String(body.id || "").trim();
  const bankId = String(body.bank_id || "").trim();
  const accountName = String(body.account_name || body.name || "").replace(/\s+/g, " ").trim();
  const accountType = parseAccountType(String(body.account_type || body.type || ""));
  const balance = Number(body.balance || 0);

  if (!id || !bankId || !accountName) {
    return NextResponse.json({ error: "Dados inválidos para a conta." }, { status: 400 });
  }

  const { data: bank, error: bankError } = await supabaseAdmin
    .from("banks")
    .select("id, name")
    .eq("id", bankId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (bankError) throw bankError;
  if (!bank?.id) return NextResponse.json({ error: "Banco inválido." }, { status: 400 });

  const payload = {
    bank_id: bank.id,
    institution_name: bank.name,
    name: accountName,
    type: accountType,
    subtype: accountType,
    currency_code: "BRL",
    balance: Number.isFinite(balance) ? balance : 0,
  };

  const { data, error } = await supabaseAdmin
    .from("accounts")
    .update(payload)
    .eq("id", id)
    .eq("profile_id", user.id)
    .select("id")
    .single();

  if (error) throw error;
  return NextResponse.json({ ok: true, id: data?.id });
}
