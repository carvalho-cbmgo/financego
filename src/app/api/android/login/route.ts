import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ensureProfile } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase";

function publicSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json({ error: "Informe e-mail e senha." }, { status: 400 });
    }

    const { data, error } = await publicSupabase().auth.signInWithPassword({ email, password });
    if (error || !data.session || !data.user) {
      return NextResponse.json({ error: error?.message || "Login inválido." }, { status: 401 });
    }

    await ensureProfile(data.user.id, data.user.email || email, data.user.user_metadata?.full_name || null);

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email")
      .eq("id", data.user.id)
      .maybeSingle();

    return NextResponse.json({
      ok: true,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      user: {
        id: data.user.id,
        email: profile?.email || data.user.email || email,
        full_name: profile?.full_name || data.user.user_metadata?.full_name || "",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro no login Android." }, { status: 500 });
  }
}
