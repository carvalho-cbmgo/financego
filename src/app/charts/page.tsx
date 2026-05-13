import { PageShell, Card } from "@/components/ui";
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
    .select("amount, app_category, posted_at")
    .gte("posted_at", `${ref}-01T00:00:00.000Z`);

  const byCategory = new Map<string, number>();
  let total = 0;

  for (const tx of txs || []) {
    const amount = Number(tx.amount || 0);
    if (amount < 0) {
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
      <div style={{ display: "grid", gap: 16 }}>
        <h1 style={{ margin: 0 }}>Gráficos financeiros</h1>
        <Card title={`Gastos por categoria — ${ref}`}>
          <div style={{ display: "grid", gap: 14 }}>
            {rows.map((row: any) => (
              <div key={row.category}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <strong>{row.category}</strong>
                  <span>{brl(row.value)} • {row.pct.toFixed(1)}%</span>
                </div>
                <div style={{ height: 12, background: "#e5e7eb", borderRadius: 999 }}>
                  <div style={{ width: `${Math.min(row.pct, 100)}%`, height: "100%", background: "#111827", borderRadius: 999 }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
