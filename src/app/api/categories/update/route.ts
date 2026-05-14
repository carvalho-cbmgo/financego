import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getApiUserFromCookiesOrRequest, unauthorized } from "@/lib/auth-server";

function typeFromAction(action: string) {
  const normalized = action.trim().toLowerCase();

  if (normalized === "receita" || normalized === "credit") return "credit";
  if (normalized === "transferencia" || normalized === "transferência" || normalized === "transfer") return "transfer";

  // Regra de fallback: na duvida, classifica como despesa.
  return "debit";
}

export async function POST(req: Request) {
    const user = await getApiUserFromCookiesOrRequest(req);
  if (!user) return unauthorized();
const form = await req.formData();
  const id = String(form.get("id") || "");
  const category = String(form.get("category") || "");
  const subcategory = String(form.get("subcategory") || "");
  const action = String(form.get("action") || "");
  if (id) {
    await supabaseAdmin.from("transactions").update({
      app_category: category,
      app_subcategory: subcategory,
      type: typeFromAction(action),
    }).eq("id", id)
      .eq("profile_id", user.id);
  }
  return NextResponse.redirect(new URL("/dashboard?tab=transactions", req.url));
}
