import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getApiUserFromCookiesOrRequest, unauthorized } from "@/lib/auth-server";

export async function POST(req: Request) {
    const user = await getApiUserFromCookiesOrRequest(req);
  if (!user) return unauthorized();
const form = await req.formData();
  const id = String(form.get("id") || "");
  const category = String(form.get("category") || "");
  const subcategory = String(form.get("subcategory") || "");
  if (id) {
    await supabaseAdmin.from("transactions").update({
      app_category: category,
      app_subcategory: subcategory,
    }).eq("id", id)
      .eq("profile_id", user.id);
  }
  return NextResponse.redirect(new URL("/dashboard?tab=transactions", req.url));
}
