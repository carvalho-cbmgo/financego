import { NextResponse } from "next/server";
import { getApiUserFromRequest, unauthorized } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  const user = await getApiUserFromRequest(req);
  if (!user) return unauthorized();

  const body = await req.json();
  const id = String(body.id || body.bank_id || "").trim();

  if (!id) {
    return NextResponse.json({ error: "Informe o banco para exclusão." }, { status: 400 });
  }

  const { data: bank, error: bankError } = await supabaseAdmin
    .from("banks")
    .select("id, name")
    .eq("id", id)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (bankError) throw bankError;
  if (!bank?.id) return NextResponse.json({ error: "Banco não encontrado." }, { status: 404 });

  const { count, error: countError } = await supabaseAdmin
    .from("accounts")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", user.id)
    .eq("bank_id", id);

  if (countError) throw countError;
  if ((count || 0) > 0) {
    return NextResponse.json(
      { error: "Este banco possui contas vinculadas. Remova ou mova as contas antes de excluir o banco." },
      { status: 409 },
    );
  }

  const { data: legacyLinkedAccount, error: legacyError } = await supabaseAdmin
    .from("accounts")
    .select("id")
    .eq("profile_id", user.id)
    .eq("institution_name", bank.name)
    .limit(1)
    .maybeSingle();

  if (legacyError) throw legacyError;
  if (legacyLinkedAccount?.id) {
    return NextResponse.json(
      { error: "Este banco possui contas vinculadas pelo nome. Remova ou mova as contas antes de excluir o banco." },
      { status: 409 },
    );
  }

  const { error } = await supabaseAdmin
    .from("banks")
    .delete()
    .eq("id", id)
    .eq("profile_id", user.id);

  if (error) throw error;
  return NextResponse.json({ ok: true, deleted: 1 });
}
