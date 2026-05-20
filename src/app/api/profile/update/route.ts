import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getApiUserFromCookiesOrRequest, unauthorized } from "@/lib/auth-server";

function normalizeFullName(input: unknown) {
  return String(input || "").replace(/\s+/g, " ").trim();
}

export async function POST(req: Request) {
  const user = await getApiUserFromCookiesOrRequest(req);
  if (!user) return unauthorized();

  const contentType = req.headers.get("content-type") || "";
  let fullName = "";
  let returnUrl = "/profile?updated=1";

  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    fullName = normalizeFullName(body.full_name);
    if (typeof body.return_url === "string" && body.return_url.startsWith("/")) {
      returnUrl = body.return_url;
    }
  } else {
    const form = await req.formData();
    fullName = normalizeFullName(form.get("full_name"));
    const formReturnUrl = String(form.get("return_url") || "");
    if (formReturnUrl.startsWith("/")) returnUrl = formReturnUrl;
  }

  if (fullName.length < 3) {
    if (contentType.includes("application/json")) {
      return NextResponse.json({ error: "Informe o nome completo." }, { status: 400 });
    }

    return NextResponse.redirect(new URL("/profile?error=invalid_full_name", req.url));
  }

  await supabaseAdmin
    .from("profiles")
    .update({ full_name: fullName, email: user.email || null })
    .eq("id", user.id);

  if (contentType.includes("application/json")) {
    return NextResponse.json({ ok: true, full_name: fullName });
  }

  return NextResponse.redirect(new URL(returnUrl, req.url));
}
