import crypto from "crypto";
import { supabaseAdmin } from "./supabase";

export function hashDeviceToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function getDeviceByToken(token: string | null) {
  if (!token) return null;
  const tokenHash = hashDeviceToken(token);
  const { data } = await supabaseAdmin
    .from("sync_devices")
    .select("id, profile_id, device_public_id, enabled")
    .eq("token_hash", tokenHash)
    .eq("enabled", true)
    .maybeSingle();
  return data || null;
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}
