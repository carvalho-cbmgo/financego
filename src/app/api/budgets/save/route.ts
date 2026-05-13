import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getApiUserFromCookiesOrRequest, unauthorized } from "@/lib/auth-server";

export async function POST(req: Request) {
    const user = await getApiUserFromCookiesOrRequest(req);
  if (!user) return unauthorized();
const form = await req.formData();
  const month_ref = String(form.get("month_ref") || "");
  const categories = form.getAll("category").map(String);
  const plannedAmounts = form.getAll("planned_amount").map((v) => Number(v || 0));
  const profile_id = user.id;

  for (let i = 0; i < categories.length; i++) {
    if (!categories[i]) continue;
    await supabaseAdmin.from("budgets").upsert({
      profile_id,
      month_ref,
      category: categories[i],
      planned_amount: plannedAmounts[i] || 0,
    }, { onConflict: "profile_id,month_ref,category" });
  }
  return NextResponse.redirect(new URL("/budgets", req.url));
}
