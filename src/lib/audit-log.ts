import { supabaseAdmin } from "./supabase";

export async function auditLog(input: { profileId?: string | null; action: string; resource?: string; metadata?: any }) {
  try {
    await supabaseAdmin.from("audit_logs").insert({
      profile_id: input.profileId || null,
      action: input.action,
      resource: input.resource || null,
      metadata: input.metadata || null,
    });
  } catch {}
}
