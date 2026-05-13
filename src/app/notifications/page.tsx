import { PageShell, Card } from "@/components/ui";
import { requireServerSession } from "@/lib/auth-server";
import { createUserDb } from "@/lib/user-db";
import { shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const { user, accessToken } = await requireServerSession();
  const supabaseAdmin = createUserDb(accessToken);
  const { data: events } = await supabaseAdmin
    .from("notification_events")
    .select("id, app_name, package_name, title, text, big_text, parsed, ignored_reason, received_at")
    .eq("profile_id", user.id)
    .order("received_at", { ascending: false })
    .limit(50);

  return (
    <PageShell>
      <div style={{ display: "grid", gap: 16 }}>
        <h1 style={{ margin: 0 }}>Notificações bancárias</h1>
        <Card title="Últimas notificações recebidas">
          <div style={{ display: "grid", gap: 10 }}>
            {(events || []).map((event: any) => (
              <div key={event.id} style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <strong>{event.app_name || event.package_name || "App desconhecido"}</strong>
                  <span>{shortDate(event.received_at)}</span>
                </div>
                <div style={{ color: "#374151", marginTop: 6 }}>{event.title}</div>
                <div style={{ color: "#6b7280", marginTop: 4 }}>{event.big_text || event.text}</div>
                <div style={{ marginTop: 8, fontSize: 13 }}>
                  Status: {event.parsed ? "transação criada" : `ignorada (${event.ignored_reason || "sem motivo"})`}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
