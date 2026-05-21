import { NextResponse } from "next/server";
import { getApiUserFromRequest, unauthorized } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase";

type RepeatScope = "single" | "from_current" | "from_first";

function parseRepeatScope(input: any): RepeatScope {
  const value = String(input || "").trim().toLowerCase();
  if (value === "from_current" || value === "future" || value === "a_partir_desta") return "from_current";
  if (value === "from_first" || value === "all" || value === "a_partir_da_primeira") return "from_first";
  return "single";
}

export async function POST(req: Request) {
  const user = await getApiUserFromRequest(req);
  if (!user) return unauthorized();

  const body = await req.json();
  const id = String(body.id || "").trim();
  const repeatScope = parseRepeatScope(body.repeat_scope);

  if (!id) return NextResponse.json({ error: "Informe a transação para exclusão." }, { status: 400 });

  const { data: tx, error: fetchError } = await supabaseAdmin
    .from("transactions")
    .select("id, posted_at, type, installment_group_key, is_consolidated")
    .eq("profile_id", user.id)
    .eq("id", id)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!tx?.id) return NextResponse.json({ error: "Transação não encontrada." }, { status: 404 });

  const groupKey = String((tx as any).installment_group_key || "");
  const postedAt = String((tx as any).posted_at || "");
  const isTransferGroup = String((tx as any).type || "").toLowerCase() === "transfer" && groupKey.startsWith("android-transfer-");
  let ids = [id];

  if (repeatScope !== "single" && groupKey) {
    let query = supabaseAdmin
      .from("transactions")
      .select("id")
      .eq("profile_id", user.id)
      .eq("installment_group_key", groupKey)
      .eq("is_consolidated", false)
      .order("posted_at", { ascending: true });

    if (repeatScope === "from_current") query = query.gte("posted_at", postedAt);

    const { data: targets, error: targetError } = await query;
    if (targetError) throw targetError;
    ids = (targets || []).map((row: any) => row.id).filter(Boolean);
  } else if (isTransferGroup && postedAt) {
    const { data: pairRows, error: pairError } = await supabaseAdmin
      .from("transactions")
      .select("id")
      .eq("profile_id", user.id)
      .eq("installment_group_key", groupKey)
      .eq("posted_at", postedAt);

    if (pairError) throw pairError;
    ids = (pairRows || []).map((row: any) => row.id).filter(Boolean);
  }

  if (!ids.length) ids = [id];

  const { error: deleteError } = await supabaseAdmin
    .from("transactions")
    .delete()
    .eq("profile_id", user.id)
    .in("id", ids);

  if (deleteError) throw deleteError;
  return NextResponse.json({ ok: true, deleted: ids.length });
}
