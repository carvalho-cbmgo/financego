import { PageShell, Card, SectionIntro, Stat } from "@/components/ui";
import { requireServerSession } from "@/lib/auth-server";
import { createUserDb } from "@/lib/user-db";
import { brl, monthRef } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ChartsPage() {
  const { user, accessToken } = await requireServerSession();
  const supabaseAdmin = createUserDb(accessToken);
  const ref = monthRef();

  const { data: txs } = await supabaseAdmin
    .from("transactions")
    .select("amount, app_category, posted_at, is_consolidated")
    .eq("profile_id", user.id)
    .gte("posted_at", `${ref}-01T00:00:00.000Z`);

  const byCategory = new Map<string, number>();
  let total = 0;

  for (const tx of txs || []) {
    const amount = Number(tx.amount || 0);
    if (tx.is_consolidated !== false && amount < 0) {
      const value = Math.abs(amount);
      total += value;
      const category = tx.app_category || "Outros";
      byCategory.set(category, (byCategory.get(category) || 0) + value);
    }
  }

  const rows = Array.from(byCategory.entries())
    .map(([category, value]) => ({ category, value, pct: total > 0 ? (value / total) * 100 : 0 }))
    .sort((a, b) => b.value - a.value);

  return (
    <PageShell>
      <div className="fg-stack">
        <SectionIntro
          title="Graficos financeiros"
          subtitle="Distribuicao das despesas consolidadas por categoria no mes atual."
        />

        <div className="fg-grid-4">
          <Stat label="Mes" value={ref} />
          <Stat label="Categorias com gasto" value={String(rows.length)} />
          <Stat label="Total de despesas" value={brl(total)} tone="negative" />
          <Stat label="Maior categoria" value={rows[0]?.category || "-"} />
        </div>

        <Card title={`Gastos por categoria - ${ref}`}>
          {rows.length ? (
            <div className="fg-stack" style={{ gap: 14 }}>
              {rows.map((row) => (
                <div key={row.category}>
                  <div className="fg-category-row" style={{ marginBottom: 6 }}>
                    <strong>{row.category}</strong>
                    <span>{brl(row.value)} - {row.pct.toFixed(1)}%</span>
                  </div>
                  <div className="fg-category-bar" style={{ height: 12 }}>
                    <span style={{ width: `${Math.min(row.pct, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="fg-empty">Nao ha despesas consolidadas para gerar o grafico neste mes.</div>
          )}
        </Card>
      </div>
    </PageShell>
  );
}

