import { NextResponse } from "next/server";
import { getApiUserFromRequest, unauthorized } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  const user = await getApiUserFromRequest(req);
  if (!user) return unauthorized();

  const body = await req.json();
  const id = String(body.id || "").trim();

  if (!id) return NextResponse.json({ error: "Informe a conta para exclusão." }, { status: 400 });

  const { data: account, error: fetchError } = await supabaseAdmin
    .from("accounts")
    .select("id")
    .eq("id", id)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!account?.id) return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });

  const { error } = await supabaseAdmin
    .from("accounts")
    .delete()
    .eq("id", id)
    .eq("profile_id", user.id);

  if (error) throw error;
  return NextResponse.json({ ok: true, deleted: 1 });
}
