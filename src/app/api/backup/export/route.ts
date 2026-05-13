import { NextRequest, NextResponse } from "next/server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { auditLog } from "@/lib/audit-log";
import { supabaseAdmin } from "@/lib/supabase";
import { getApiUserFromCookiesOrRequest, unauthorized } from "@/lib/auth-server";

export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const rl = rateLimit(`${ip}:backup_export`, 10, 60_000);
    if (!rl.ok) return rateLimitResponse();

    const user = await getApiUserFromCookiesOrRequest(req);
    if (!user) return unauthorized();

    await auditLog({ profileId: user.id, action: "backup_export", resource: req.url });

    const profileId = user.id;

    const [accounts, transactions, budgets, goals, notifications] = await Promise.all([
      supabaseAdmin.from("accounts").select("*").eq("profile_id", profileId),
      supabaseAdmin.from("transactions").select("*").eq("profile_id", profileId).order("posted_at", { ascending: false }),
      supabaseAdmin.from("budgets").select("*").eq("profile_id", profileId),
      supabaseAdmin.from("financial_goals").select("*").eq("profile_id", profileId),
      supabaseAdmin.from("notification_events").select("*").eq("profile_id", profileId).order("received_at", { ascending: false }),
    ]);

    const backup = {
      exported_at: new Date().toISOString(),
      profile_id: profileId,
      version: "v12",
      accounts: accounts.data || [],
      transactions: transactions.data || [],
      budgets: budgets.data || [],
      goals: goals.data || [],
      notifications: notifications.data || [],
    };

    await supabaseAdmin.from("backup_runs").insert({
      profile_id: profileId,
      status: "success",
      finished_at: new Date().toISOString(),
      total_transactions: backup.transactions.length,
      total_accounts: backup.accounts.length,
      message: "Backup JSON gerado",
    });

    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="finance-backup-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
