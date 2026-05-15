import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getApiUserFromCookiesOrRequest, unauthorized } from "@/lib/auth-server";

function safeReturnUrl(input: string) {
  if (input.startsWith("/dashboard")) return input;
  return "/dashboard?tab=transactions";
}

export async function POST(req: Request) {
  const user = await getApiUserFromCookiesOrRequest(req);
  if (!user) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const oldCategory = String(body?.old_category || "").trim();
  const newCategory = String(body?.new_category || "").trim();
  const returnUrl = safeReturnUrl(String(body?.return_url || ""));

  if (!oldCategory || !newCategory) {
    return NextResponse.json({ error: "Categorias invalidas para renomeacao." }, { status: 400 });
  }

  if (oldCategory === newCategory) {
    return NextResponse.json({ ok: true, redirectTo: returnUrl });
  }

  await supabaseAdmin
    .from("transactions")
    .update({ app_category: newCategory, app_subcategory: null })
    .eq("profile_id", user.id)
    .eq("app_category", oldCategory);

  await supabaseAdmin
    .from("budgets")
    .update({ category: newCategory })
    .eq("profile_id", user.id)
    .eq("category", oldCategory);

  return NextResponse.json({ ok: true, redirectTo: returnUrl });
}
