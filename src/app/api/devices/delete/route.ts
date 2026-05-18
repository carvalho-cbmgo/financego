import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getApiUserFromCookiesOrRequest, unauthorized } from "@/lib/auth-server";

export async function POST(req: Request) {
  const user = await getApiUserFromCookiesOrRequest(req);
  if (!user) return unauthorized();

  const form = await req.formData();
  const deviceId = String(form.get("device_id") || "").trim();
  const returnUrl = safeReturnUrl(String(form.get("return_url") || "/mobile/pair"));

  if (!deviceId) {
    return NextResponse.redirect(new URL(withStatus(returnUrl, "error", "missing_device"), req.url));
  }

  const { data: existingDevice } = await supabaseAdmin
    .from("sync_devices")
    .select("id")
    .eq("id", deviceId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!existingDevice?.id) {
    return NextResponse.redirect(new URL(withStatus(returnUrl, "error", "device_not_found"), req.url));
  }

  const { error } = await supabaseAdmin
    .from("sync_devices")
    .delete()
    .eq("id", deviceId)
    .eq("profile_id", user.id);

  if (error) {
    return NextResponse.redirect(new URL(withStatus(returnUrl, "error", "delete_failed"), req.url));
  }

  return NextResponse.redirect(new URL(withStatus(returnUrl, "ok", "device_deleted"), req.url));
}

function safeReturnUrl(input: string) {
  if (input.startsWith("/mobile/pair")) return input;
  return "/mobile/pair";
}

function withStatus(url: string, key: "ok" | "error", value: string) {
  const params = new URLSearchParams();
  const [basePath, queryRaw] = String(url || "/mobile/pair").split("?");

  if (queryRaw) {
    const existing = new URLSearchParams(queryRaw);
    existing.forEach((itemValue, itemKey) => params.set(itemKey, itemValue));
  }

  params.set(key, value);
  return `${basePath}?${params.toString()}`;
}
