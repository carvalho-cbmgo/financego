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

function relationMissing(error: any) {
  const message = String(error?.message || "");
  const code = String(error?.code || "");
  return code === "PGRST205" || /relation .*categories.* does not exist/i.test(message);
}

async function getCategoryByName(profileId: string, name: string) {
  const { data, error } = await supabaseAdmin
    .from("categories")
    .select("id, name, parent_id, profile_id")
    .eq("profile_id", profileId)
    .eq("name", name)
    .maybeSingle();

  if (error) throw error;
  return (data as CategoryRow | null) || null;
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

  const { data: sourceRows, error: sourceError } = await supabaseAdmin
    .from("budgets")
    .select("id, month_ref, planned_amount")
    .eq("profile_id", profileId)
    .eq("category", oldCategory);

  if (sourceError) throw sourceError;
  if (!sourceRows?.length) return;

  for (const row of sourceRows) {
    const { data: targetRow, error: targetError } = await supabaseAdmin
      .from("budgets")
      .select("id, planned_amount")
      .eq("profile_id", profileId)
      .eq("month_ref", row.month_ref)
      .eq("category", newCategory)
      .maybeSingle();

    if (targetError) throw targetError;

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

  const { error: txError } = await supabaseAdmin
    .from("transactions")
    .update({ app_category: newCategory, app_subcategory: null })
    .eq("profile_id", profileId)
    .eq("app_category", oldCategory);
  if (txError) throw txError;

  await mergeBudgetsCategory(profileId, oldCategory, newCategory);
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
        return NextResponse.json({ error: "A categoria Raiz nao pode ser renomeada." }, { status: 400 });
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
        return NextResponse.json({ error: "Uma categoria nao pode ter ela mesma como categoria pai." }, { status: 400 });
      }

      const duplicate = await getCategoryByName(user.id, normalizedNextName);
      if (duplicate?.id && duplicate.id !== current.id) {
        return NextResponse.json({ error: "Ja existe uma categoria com esse nome." }, { status: 409 });
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

      await renameCategoryEverywhere(user.id, normalizedCurrentName, normalizedNextName);

      return NextResponse.json({ ok: true });
    }

    if (action === "add_subcategory") {
      if (!newName) {
        return NextResponse.json({ error: "Informe o nome da sub-categoria." }, { status: 400 });
      }

      if (normalizeCategoryName(newName) === ROOT_CATEGORY_NAME) {
        return NextResponse.json({ error: "Raiz e reservada para categoria pai padrao." }, { status: 400 });
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
        return NextResponse.json({ error: "Informe a categoria para exclusao." }, { status: 400 });
      }

      const normalizedCurrentName = normalizeCategoryName(categoryName);

      if (normalizedCurrentName === ROOT_CATEGORY_NAME || normalizedCurrentName === "Outros") {
        return NextResponse.json({ error: "A categoria informada nao pode ser excluida." }, { status: 400 });
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

      await renameCategoryEverywhere(user.id, normalizedCurrentName, "Outros");
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Acao de categoria invalida." }, { status: 400 });
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
