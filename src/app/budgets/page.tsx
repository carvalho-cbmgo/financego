import { PageShell, Card, SectionIntro, Stat } from "@/components/ui";
import { requireServerSession } from "@/lib/auth-server";
import { createUserDb } from "@/lib/user-db";
import { brl, monthRef } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function BudgetsPage() {
  const { user, accessToken } = await requireServerSession();
  const supabaseAdmin = createUserDb(accessToken);
  const ref = monthRef();

  const [{ data: budgets }, { data: monthTxs }] = await Promise.all([
    supabaseAdmin
      .from("budgets")
      .select("id, category, planned_amount")
      .eq("profile_id", user.id)
      .eq("month_ref", ref)
      .order("category"),
    supabaseAdmin
      .from("transactions")
      .select("amount, app_category, posted_at, is_consolidated")
      .eq("profile_id", user.id)
      .gte("posted_at", `${ref}-01T00:00:00.000Z`),
  ]);

  const spentByCategory = new Map<string, number>();
  for (const tx of (monthTxs || []) as any[]) {
    if (tx.is_consolidated !== false && Number(tx.amount) < 0) {
      const key = tx.app_category || "Outros";
      spentByCategory.set(key, (spentByCategory.get(key) || 0) + Math.abs(Number(tx.amount)));
    }
  }

  const totalPlanned = (budgets || []).reduce((sum: number, item: any) => sum + Number(item.planned_amount || 0), 0);
  const totalSpent = Array.from(spentByCategory.values()).reduce((sum, value) => sum + value, 0);

  return (
    <PageShell>
      <div className="fg-stack" style={{ maxWidth: 1100 }}>
        <SectionIntro
          title="Orcamento mensal"
          subtitle="Defina limites por categoria e acompanhe consumo realizado nas transacoes consolidadas."
        />

        <div className="fg-grid-4">
          <Stat label="Mes de referencia" value={ref} />
          <Stat label="Total planejado" value={brl(totalPlanned)} />
          <Stat label="Total realizado" value={brl(totalSpent)} tone="negative" />
          <Stat
            label="Saldo do orcamento"
            value={brl(totalPlanned - totalSpent)}
            tone={totalPlanned - totalSpent >= 0 ? "positive" : "negative"}
          />
        </div>

        <Card title={`Planejamento de ${ref}`}>
          <BudgetForm monthRefValue={ref} />
        </Card>

        <Card title="Resumo por categoria">
          <div className="fg-table-wrap">
            <table className="fg-table">
              <thead>
                <tr>
                  <th>Categoria</th>
                  <th>Planejado</th>
                  <th>Realizado</th>
                  <th>Consumo</th>
                </tr>
              </thead>
              <tbody>
                {(budgets || []).map((item: any) => {
                  const spent = spentByCategory.get(item.category) || 0;
                  const pct = Number(item.planned_amount) > 0 ? (spent / Number(item.planned_amount)) * 100 : 0;
                  return (
                    <tr key={item.id}>
                      <td>{item.category}</td>
                      <td>{brl(item.planned_amount)}</td>
                      <td>{brl(spent)}</td>
                      <td>{pct.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}

function BudgetForm({ monthRefValue }: { monthRefValue: string }) {
  const rows = ["Alimentacao", "Casa", "Transporte", "Saude", "Lazer", "Outros"];
  return (
    <form action="/api/budgets/save" method="post" className="fg-form">
      <input type="hidden" name="month_ref" value={monthRefValue} />
      {rows.map((category) => (
        <div key={category} className="fg-grid-2">
          <input name="category" value={category} readOnly className="fg-input" />
          <input name="planned_amount" type="number" step="0.01" placeholder={`Valor para ${category}`} className="fg-input" />
        </div>
      ))}
      <button className="fg-btn">Salvar orcamento</button>
    </form>
  );
}

