import { NextResponse } from "next/server";
import { getApiUserFromCookiesOrRequest, unauthorized } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase";

type DeleteScope = "single" | "up_to_current" | "from_current" | "all";

function parseDeleteScope(input: unknown): DeleteScope {
  const value = String(input || "").trim().toLowerCase();
  if (value === "up_to_current") return "up_to_current";
  if (value === "from_current") return "from_current";
  if (value === "all" || value === "series" || value === "toda") return "all";
  return "single";
}

function targetRowsForScope(rows: Array<{ id: string; posted_at: string | null }>, currentId: string, currentPostedAt: string, scope: DeleteScope) {
  if (scope === "all") return rows;

  return rows.filter((row) => {
    const postedAt = String(row.posted_at || "");
    if (scope === "up_to_current") return postedAt <= currentPostedAt || row.id === currentId;
    if (scope === "from_current") return postedAt >= currentPostedAt || row.id === currentId;
    return row.id === currentId;
  });
}

export async function POST(req: Request) {
  const user = await getApiUserFromCookiesOrRequest(req);
  if (!user) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const id = String(body?.id || "").trim();
  const deleteScope = parseDeleteScope(body?.delete_scope);

  if (!id) {
    return NextResponse.json({ error: "Informe a transação para exclusão." }, { status: 400 });
  }

  const { data: existingTx, error: fetchError } = await supabaseAdmin
    .from("transactions")
    .select("id, profile_id, installment_group_key, posted_at, type")
    .eq("profile_id", user.id)
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!existingTx?.id) {
    return NextResponse.json({ error: "Transação não encontrada ou já excluída." }, { status: 404 });
  }

  const groupKey = String((existingTx as any).installment_group_key || "");
  const currentPostedAt = String((existingTx as any).posted_at || "");
  const isTransferGroup = groupKey.startsWith("manual-transfer-") || groupKey.startsWith("android-transfer-");
  let targetIds = [id];

  if (groupKey && (deleteScope !== "single" || isTransferGroup)) {
    const { data: groupRows, error: groupError } = await supabaseAdmin
      .from("transactions")
      .select("id, posted_at")
      .eq("profile_id", user.id)
      .eq("installment_group_key", groupKey)
      .order("posted_at", { ascending: true });

    if (groupError) {
      return NextResponse.json({ error: groupError.message }, { status: 500 });
    }

    const rows = (groupRows || []).map((row: any) => ({
      id: String(row.id || ""),
      posted_at: row.posted_at ? String(row.posted_at) : null,
    }));

    const scopedRows: Array<{ id: string; posted_at: string | null }> = isTransferGroup
      ? rows
      : targetRowsForScope(rows, id, currentPostedAt, deleteScope);

    targetIds = Array.from(
      new Set([
        ...scopedRows.map((row) => row.id).filter(Boolean),
        id,
      ]),
    );
  }

  const { data: deletedRows, error: deleteError } = await supabaseAdmin
    .from("transactions")
    .delete()
    .eq("profile_id", user.id)
    .in("id", targetIds)
    .select("id");

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  const deletedIds = (deletedRows || []).map((row: any) => String(row.id || "")).filter(Boolean);
  if (!deletedIds.length || !deletedIds.includes(id)) {
    return NextResponse.json(
      {
        error: "Nenhuma transação foi excluída. Atualize a página e tente novamente.",
        requested: targetIds.length,
        deleted: deletedIds.length,
      },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true, deleted: deletedIds.length, ids: deletedIds });
}
