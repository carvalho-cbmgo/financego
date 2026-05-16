import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getApiUserFromCookiesOrRequest, unauthorized } from "@/lib/auth-server";

type Intent = "delete" | "consolidate" | "unconsolidate";

export async function POST(req: Request) {
  const user = await getApiUserFromCookiesOrRequest(req);
  if (!user) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const intent = String(body?.intent || "") as Intent;
  const txIds = Array.from(
    new Set(
      (Array.isArray(body?.tx_ids) ? body.tx_ids : [])
        .map((value: any) => String(value || "").trim())
        .filter(Boolean),
    ),
  );

  if (!txIds.length) {
    return NextResponse.json({ error: "Selecione ao menos uma transação." }, { status: 400 });
  }

  if (!["delete", "consolidate", "unconsolidate"].includes(intent)) {
    return NextResponse.json({ error: "Ação inválida para lote." }, { status: 400 });
  }

  if (intent === "delete") {
    const { error } = await supabaseAdmin
      .from("transactions")
      .delete()
      .eq("profile_id", user.id)
      .in("id", txIds);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, affected: txIds.length });
  }

  const isConsolidated = intent === "consolidate";
  const { error } = await supabaseAdmin
    .from("transactions")
    .update({
      is_consolidated: isConsolidated,
      status: isConsolidated ? "posted" : "planned",
    })
    .eq("profile_id", user.id)
    .in("id", txIds);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, affected: txIds.length });
}

