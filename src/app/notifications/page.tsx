import { PageShell, Card, SectionIntro, Stat } from "@/components/ui";
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

  const parsedCount = (events || []).filter((event: any) => event.parsed).length;

  return (
    <PageShell>
      <div className="fg-stack">
        <SectionIntro
          title="Notificacoes bancarias"
          subtitle="Historico de notificacoes recebidas e resultado da leitura automatica."
        />

        <div className="fg-grid-4">
          <Stat label="Eventos listados" value={String((events || []).length)} />
          <Stat label="Convertidos em transacao" value={String(parsedCount)} tone="positive" />
          <Stat label="Ignorados" value={String((events || []).length - parsedCount)} />
          <Stat label="Ultimo evento" value={events?.[0]?.received_at ? shortDate(events[0].received_at) : "-"} />
        </div>

        <Card title="Ultimas notificacoes recebidas">
          {(events || []).length ? (
            <div className="fg-stack" style={{ gap: 10 }}>
              {(events || []).map((event: any) => (
                <div key={event.id} style={{ border: "1px solid #dde4ef", borderRadius: 14, padding: 12, background: "#fff" }}>
                  <div className="fg-category-row" style={{ marginBottom: 6 }}>
                    <strong>{event.app_name || event.package_name || "App desconhecido"}</strong>
                    <span>{shortDate(event.received_at)}</span>
                  </div>
                  <div style={{ color: "#374151" }}>{event.title}</div>
                  <div style={{ color: "#6b7280", marginTop: 4 }}>{event.big_text || event.text}</div>
                  <div style={{ marginTop: 8, fontSize: 13 }}>
                    Status: {event.parsed ? "transacao criada" : `ignorada (${event.ignored_reason || "sem motivo"})`}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="fg-empty">Nenhuma notificacao encontrada.</div>
          )}
        </Card>
      </div>
    </PageShell>
  );
}

