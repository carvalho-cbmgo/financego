import Link from "next/link";
import { requireServerSession } from "@/lib/auth-server";
import { createUserDb } from "@/lib/user-db";
import { monthRef } from "@/lib/format";
import { MobilePairingPanel } from "@/components/mobile-pairing-panel";

export const dynamic = "force-dynamic";

type PairPageParams = {
  month_ref?: string;
  ok?: string;
  error?: string;
};

export default async function MobilePairPage({ searchParams }: { searchParams: Promise<PairPageParams> }) {
  const params = await searchParams;
  const selectedMonthRef = normalizeMonthRef(String(params.month_ref || ""), monthRef());
  const status = buildStatusMessage(params.ok, params.error);
  const { user, accessToken } = await requireServerSession();
  const supabaseAdmin = createUserDb(accessToken);

  const { data: devices } = await supabaseAdmin
    .from("sync_devices")
    .select("id, device_name, platform, enabled, device_public_id, created_at, last_seen_at")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <main className="fg-mobile-screen">
      <header className="fg-mobile-topbar fg-mobile-pair-topbar">
        <div className="fg-mobile-topbar-row">
          <Link href={`/mobile?month_ref=${selectedMonthRef}`} className="fg-mobile-icon-btn" aria-label="Voltar para visao geral">
            {"<"}
          </Link>
          <div className="fg-mobile-title">Pareamento Android</div>
        </div>
      </header>

      <section className="fg-mobile-content">
        <section className="fg-mobile-section">
          <h3 className="fg-mobile-section-title">Passo 1 - gerar credenciais</h3>
          <article className="fg-mobile-card">
            {status ? <p className={`fg-mobile-pair-help ${status.tone === "error" ? "is-error" : "is-ok"}`}>{status.text}</p> : null}
            <p className="fg-mobile-pair-help">
              Toque em <strong>Conectar app automaticamente</strong> para abrir o companion sem digitar dados.
              Se o Android bloquear a abertura automatica, use o modo manual logo abaixo.
            </p>
            <MobilePairingPanel defaultDeviceName="Android principal" />
          </article>
        </section>

        <section className="fg-mobile-section">
          <h3 className="fg-mobile-section-title">Passo 2 - configurar app Android</h3>
          <article className="fg-mobile-card">
            <ol className="fg-mobile-pair-steps">
              <li>Se abriu automaticamente, apenas confirme no app companion e toque em salvar.</li>
              <li>Caso o auto pareamento não abra, preencha manualmente URL, Device Public ID e Device Token.</li>
              <li>Conceda permissão de leitura de notificações.</li>
              <li>Desative otimização de bateria para manter captura em tempo real.</li>
            </ol>
            <p className="fg-mobile-pair-help">
              Companion Android minimo incluido no repositorio em <code>android-companion-min/</code>.
            </p>
          </article>
        </section>

        <section className="fg-mobile-section">
          <h3 className="fg-mobile-section-title">Dispositivos pareados</h3>
          <article className="fg-mobile-card">
            {(devices || []).length ? (
              <ul className="fg-mobile-pair-devices">
                {(devices || []).map((device: any) => (
                  <li key={device.id} className="fg-mobile-pair-device-item">
                    <div>
                      <div className="fg-mobile-pair-device-name">{String(device.device_name || "Android")}</div>
                      <div className="fg-mobile-pair-device-meta">
                        {String(device.platform || "android")} - {device.enabled ? "ativo" : "inativo"}
                      </div>
                      <div className="fg-mobile-pair-device-meta">ID: {String(device.device_public_id || "-")}</div>
                    </div>
                    <div className="fg-mobile-pair-device-meta">
                      Ultimo contato: {device.last_seen_at ? formatDate(device.last_seen_at) : "-"}
                    </div>
                    <form action="/api/devices/delete" method="post" className="fg-mobile-pair-device-actions">
                      <input type="hidden" name="device_id" value={String(device.id || "")} />
                      <input type="hidden" name="return_url" value={`/mobile/pair?month_ref=${encodeURIComponent(selectedMonthRef)}`} />
                      <button className="fg-btn-danger">Excluir dispositivo</button>
                    </form>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="fg-mobile-empty">Nenhum dispositivo pareado ainda.</div>
            )}
          </article>
        </section>
      </section>
    </main>
  );
}

function normalizeMonthRef(input: string, fallback: string) {
  const value = String(input || "").trim();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return fallback;
  return value;
}

function formatDate(input: string) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function buildStatusMessage(okValue?: string, errorValue?: string) {
  const okMap: Record<string, string> = {
    device_deleted: "Dispositivo pareado excluido com sucesso.",
  };

  const errorMap: Record<string, string> = {
    missing_device: "Dispositivo inválido para exclusão.",
    device_not_found: "Dispositivo não encontrado para este usuário.",
    delete_failed: "Não foi possível excluir o dispositivo agora.",
  };

  if (errorValue && errorMap[errorValue]) return { tone: "error" as const, text: errorMap[errorValue] };
  if (okValue && okMap[okValue]) return { tone: "ok" as const, text: okMap[okValue] };
  return null;
}
