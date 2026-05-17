import Link from "next/link";
import { requireServerSession } from "@/lib/auth-server";
import { createUserDb } from "@/lib/user-db";
import { monthRef } from "@/lib/format";
import { MobilePairingPanel } from "@/components/mobile-pairing-panel";

export const dynamic = "force-dynamic";

type PairPageParams = {
  month_ref?: string;
};

export default async function MobilePairPage({ searchParams }: { searchParams: Promise<PairPageParams> }) {
  const params = await searchParams;
  const selectedMonthRef = normalizeMonthRef(String(params.month_ref || ""), monthRef());
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
            <p className="fg-mobile-pair-help">
              Gere um novo pareamento e copie os campos <strong>Device Public ID</strong> e <strong>Device Token</strong>.
              Esses dados serao usados no app Android companion.
            </p>
            <MobilePairingPanel defaultDeviceName="Android principal" />
          </article>
        </section>

        <section className="fg-mobile-section">
          <h3 className="fg-mobile-section-title">Passo 2 - configurar app Android</h3>
          <article className="fg-mobile-card">
            <ol className="fg-mobile-pair-steps">
              <li>No Android companion, informe URL base do FinanceGO (ex.: https://seu-projeto.vercel.app).</li>
              <li>Cole o Device Public ID e o Device Token gerados acima.</li>
              <li>Conceda permissao de leitura de notificacoes.</li>
              <li>Desative otimizacao de bateria para manter captura em tempo real.</li>
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
