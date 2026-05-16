import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getApiUserFromCookiesOrRequest, unauthorized } from "@/lib/auth-server";
import { cleanCategoryName, normalizeCategoryName, ROOT_CATEGORY_NAME } from "@/lib/category-catalog";

type CategoryRow = {
  id: string;
  name: string;
  parent_id: string | null;
  profile_id: string;
};

function normalizeLookup(input?: string | null) {
  return String(input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function relationMissing(error: any) {
  const message = String(error?.message || "");
  const code = String(error?.code || "");
  return code === "PGRST205" || /relation .*categories.* does not exist/i.test(message);
}

async function getCategoryByName(profileId: string, name: string) {
  const normalizedTarget = normalizeLookup(name);

  const { data, error } = await supabaseAdmin
    .from("categories")
    .select("id, name, parent_id, profile_id")
    .eq("profile_id", profileId);

  if (error) throw error;
  const rows = (data || []) as CategoryRow[];
  return rows.find((row) => normalizeLookup(row.name) === normalizedTarget) || null;
}

async function ensureCategory(profileId: string, name: string, parentId: string | null) {
  const normalizedName = normalizeCategoryName(name);
  const existing = await getCategoryByName(profileId, normalizedName);
  if (existing) return existing;

  const { data, error } = await supabaseAdmin
    .from("categories")
    .insert({
      profile_id: profileId,
      name: normalizedName,
      parent_id: parentId,
    })
    .select("id, name, parent_id, profile_id")
    .single();

  if (error) {
    if (String(error.code) === "23505") {
      const afterConflict = await getCategoryByName(profileId, normalizedName);
      if (afterConflict) return afterConflict;
    }
    throw error;
  }

  return data as CategoryRow;
}

async function ensureRootCategory(profileId: string) {
  const root = await ensureCategory(profileId, ROOT_CATEGORY_NAME, null);

  if (root.parent_id) {
    await supabaseAdmin
      .from("categories")
      .update({ parent_id: null })
      .eq("id", root.id)
      .eq("profile_id", profileId);
  }

  return root;
}

async function mergeBudgetsCategory(profileId: string, oldCategory: string, newCategory: string) {
  if (oldCategory === newCategory) return;

  const oldKey = normalizeLookup(oldCategory);
  const newKey = normalizeLookup(newCategory);

  const { data: budgetRows, error: sourceError } = await supabaseAdmin
    .from("budgets")
    .select("id, month_ref, planned_amount, category")
    .eq("profile_id", profileId);

  if (sourceError) throw sourceError;
  const sourceRows = (budgetRows || []).filter((row: any) => normalizeLookup(row.category) === oldKey);
  if (!sourceRows.length) return;

  for (const row of sourceRows) {
    const targetRow = (budgetRows || []).find((target: any) => {
      if (String(target.id) === String(row.id)) return false;
      return String(target.month_ref || "") === String(row.month_ref || "") && normalizeLookup(target.category) === newKey;
    });

    if (targetRow?.id) {
      const mergedAmount = Number(targetRow.planned_amount || 0) + Number(row.planned_amount || 0);
      const { error: updateTargetError } = await supabaseAdmin
        .from("budgets")
        .update({ planned_amount: mergedAmount })
        .eq("id", targetRow.id)
        .eq("profile_id", profileId);
      if (updateTargetError) throw updateTargetError;

      const { error: deleteSourceError } = await supabaseAdmin
        .from("budgets")
        .delete()
        .eq("id", row.id)
        .eq("profile_id", profileId);
      if (deleteSourceError) throw deleteSourceError;
    } else {
      const { error: updateSourceError } = await supabaseAdmin
        .from("budgets")
        .update({ category: newCategory })
        .eq("id", row.id)
        .eq("profile_id", profileId);
      if (updateSourceError) throw updateSourceError;
    }
  }
}

async function renameCategoryEverywhere(profileId: string, oldCategory: string, newCategory: string) {
  if (oldCategory === newCategory) return;

  const oldKey = normalizeLookup(oldCategory);

  const { data: txRows, error: txLoadError } = await supabaseAdmin
    .from("transactions")
    .select("id, app_category")
    .eq("profile_id", profileId);
  if (txLoadError) throw txLoadError;

  const matchingTxIds = (txRows || [])
    .filter((row: any) => normalizeLookup(row.app_category) === oldKey)
    .map((row: any) => String(row.id));

  if (matchingTxIds.length) {
    const { error: txError } = await supabaseAdmin
      .from("transactions")
      .update({ app_category: newCategory, app_subcategory: null })
      .eq("profile_id", profileId)
      .in("id", matchingTxIds);
    if (txError) throw txError;
  }

  await mergeBudgetsCategory(profileId, oldCategory, newCategory);
}

async function deleteDuplicateNamedCategories(profileId: string, canonicalName: string, keepId?: string) {
  const canonicalKey = normalizeLookup(canonicalName);
  const { data: rows, error } = await supabaseAdmin
    .from("categories")
    .select("id, name")
    .eq("profile_id", profileId);
  if (error) throw error;

  const toDelete = (rows || [])
    .filter((row: any) => normalizeLookup(row.name) === canonicalKey && String(row.id) !== String(keepId || ""));

  if (!toDelete.length) return;

  const ids = toDelete.map((row: any) => String(row.id));
  const { error: deleteError } = await supabaseAdmin
    .from("categories")
    .delete()
    .eq("profile_id", profileId)
    .in("id", ids);
  if (deleteError) throw deleteError;
}

async function renameCategoryRows(profileId: string, oldCategory: string, newCategory: string, rootId: string) {
  const oldKey = normalizeLookup(oldCategory);
  const newKey = normalizeLookup(newCategory);

  const { data: rows, error } = await supabaseAdmin
    .from("categories")
    .select("id, name, parent_id")
    .eq("profile_id", profileId);
  if (error) throw error;

  const matching = (rows || []).filter((row: any) => normalizeLookup(row.name) === oldKey);
  if (!matching.length) return;

  const keeper = matching[0];
  const resolvedParentId = newKey === normalizeLookup(ROOT_CATEGORY_NAME)
    ? null
    : (() => {
      const target = (rows || []).find((row: any) => normalizeLookup(row.name) === newKey);
      return target?.id || rootId;
    })();

  const { error: updateKeeperError } = await supabaseAdmin
    .from("categories")
    .update({
      name: newCategory,
      parent_id: resolvedParentId,
    })
    .eq("profile_id", profileId)
    .eq("id", keeper.id);
  if (updateKeeperError) throw updateKeeperError;

  const duplicateIds = matching.slice(1).map((row: any) => String(row.id));
  if (duplicateIds.length) {
    const { error: reparentChildrenError } = await supabaseAdmin
      .from("categories")
      .update({ parent_id: keeper.id })
      .eq("profile_id", profileId)
      .in("parent_id", duplicateIds);
    if (reparentChildrenError) throw reparentChildrenError;

    const { error: deleteError } = await supabaseAdmin
      .from("categories")
      .delete()
      .eq("profile_id", profileId)
      .in("id", duplicateIds);
    if (deleteError) throw deleteError;
  }

  await deleteDuplicateNamedCategories(profileId, newCategory, keeper.id);
}

export async function POST(req: Request) {
  const user = await getApiUserFromCookiesOrRequest(req);
  if (!user) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || "").trim();
  const categoryName = cleanCategoryName(body?.category_name);
  const newName = cleanCategoryName(body?.new_name);
  const parentName = cleanCategoryName(body?.parent_name) || ROOT_CATEGORY_NAME;

  try {
    const root = await ensureRootCategory(user.id);

    if (action === "edit") {
      if (!categoryName || !newName) {
        return NextResponse.json({ error: "Informe a categoria atual e o novo nome." }, { status: 400 });
      }

      if (categoryName === ROOT_CATEGORY_NAME && newName !== ROOT_CATEGORY_NAME) {
        return NextResponse.json({ error: "A categoria Raiz não pode ser renomeada." }, { status: 400 });
      }

      const normalizedCurrentName = normalizeCategoryName(categoryName);
      const normalizedNextName = normalizeCategoryName(newName);
      const normalizedParentName = normalizeCategoryName(parentName);

      const current = normalizedCurrentName === ROOT_CATEGORY_NAME
        ? root
        : await ensureCategory(user.id, normalizedCurrentName, root.id);

      const resolvedParent = normalizedParentName === ROOT_CATEGORY_NAME
        ? root
        : await ensureCategory(user.id, normalizedParentName, root.id);

      if (current.id === resolvedParent.id && current.name !== ROOT_CATEGORY_NAME) {
        return NextResponse.json({ error: "Uma categoria não pode ter ela mesma como categoria pai." }, { status: 400 });
      }

      const duplicate = await getCategoryByName(user.id, normalizedNextName);
      if (duplicate?.id && duplicate.id !== current.id) {
        return NextResponse.json({ error: "Já existe uma categoria com esse nome." }, { status: 409 });
      }

      const { error: updateError } = await supabaseAdmin
        .from("categories")
        .update({
          name: normalizedNextName,
          parent_id: normalizedNextName === ROOT_CATEGORY_NAME ? null : resolvedParent.id,
        })
        .eq("id", current.id)
        .eq("profile_id", user.id);
      if (updateError) throw updateError;

      await renameCategoryRows(user.id, normalizedCurrentName, normalizedNextName, root.id);
      await renameCategoryEverywhere(user.id, normalizedCurrentName, normalizedNextName);

      return NextResponse.json({ ok: true });
    }

    if (action === "add_subcategory") {
      if (!newName) {
        return NextResponse.json({ error: "Informe o nome da subcategoria." }, { status: 400 });
      }

      if (normalizeCategoryName(newName) === ROOT_CATEGORY_NAME) {
        return NextResponse.json({ error: "Raiz é reservada para categoria pai padrão." }, { status: 400 });
      }

      const normalizedNextName = normalizeCategoryName(newName);
      const normalizedParentName = normalizeCategoryName(parentName);

      const resolvedParent = normalizedParentName === ROOT_CATEGORY_NAME
        ? root
        : await ensureCategory(user.id, normalizedParentName, root.id);

      const existing = await getCategoryByName(user.id, normalizedNextName);
      if (existing?.id) {
        const { error: reparentError } = await supabaseAdmin
          .from("categories")
          .update({ parent_id: resolvedParent.id })
          .eq("id", existing.id)
          .eq("profile_id", user.id);
        if (reparentError) throw reparentError;
      } else {
        await ensureCategory(user.id, normalizedNextName, resolvedParent.id);
      }

      return NextResponse.json({ ok: true });
    }

    if (action === "delete") {
      if (!categoryName) {
        return NextResponse.json({ error: "Informe a categoria para exclusão." }, { status: 400 });
      }

      const normalizedCurrentName = normalizeCategoryName(categoryName);

      if (normalizedCurrentName === ROOT_CATEGORY_NAME || normalizedCurrentName === "Outros") {
        return NextResponse.json({ error: "A categoria informada não pode ser excluída." }, { status: 400 });
      }

      const current = await getCategoryByName(user.id, normalizedCurrentName);
      if (current?.id) {
        const { error: reparentChildrenError } = await supabaseAdmin
          .from("categories")
          .update({ parent_id: root.id })
          .eq("profile_id", user.id)
          .eq("parent_id", current.id);
        if (reparentChildrenError) throw reparentChildrenError;

        const { error: deleteError } = await supabaseAdmin
          .from("categories")
          .delete()
          .eq("id", current.id)
          .eq("profile_id", user.id);
        if (deleteError) throw deleteError;
      }
      await deleteDuplicateNamedCategories(user.id, normalizedCurrentName);

      await renameCategoryEverywhere(user.id, normalizedCurrentName, "Outros");
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Ação de categoria inválida." }, { status: 400 });
  } catch (error: any) {
    if (relationMissing(error)) {
      return NextResponse.json(
        { error: "Tabela de categorias inexistente. Atualize o schema do Supabase para habilitar hierarquia de categorias." },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: String(error?.message || "Erro ao gerenciar categoria.") }, { status: 500 });
  }
}
