import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getApiUserFromCookiesOrRequest, unauthorized } from "@/lib/auth-server";

export async function POST(req: Request) {
    const user = await getApiUserFromCookiesOrRequest(req);
  if (!user) return unauthorized();
const form = await req.formData();
  const profile_id = user.id;

  await supabaseAdmin.from("financial_goals").insert({
    profile_id,
    name: String(form.get("name") || ""),
    target_amount: Number(form.get("target_amount") || 0),
    current_amount: Number(form.get("current_amount") || 0),
    target_date: String(form.get("target_date") || "") || null,
    notes: String(form.get("notes") || "") || null,
  });

  return NextResponse.redirect(new URL("/goals", req.url));
}
