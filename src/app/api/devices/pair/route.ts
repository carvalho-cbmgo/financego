import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getApiUserFromCookiesOrRequest, unauthorized } from "@/lib/auth-server";
import { hashDeviceToken, randomToken } from "@/lib/device-auth";

export async function POST(req: Request) {
  const user = await getApiUserFromCookiesOrRequest(req);
  if (!user) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const deviceName = String(body.device_name || "Android");
  const devicePublicId = crypto.randomUUID();
  const token = randomToken();

  const { error } = await supabaseAdmin.from("sync_devices").insert({
    profile_id: user.id,
    device_name: deviceName,
    platform: "android",
    device_public_id: devicePublicId,
    token_hash: hashDeviceToken(token),
    enabled: true,
    last_seen_at: new Date().toISOString(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    device_public_id: devicePublicId,
    device_token: token,
    warning: "Mostre este token apenas uma vez e salve no Android com segurança."
  });
}
