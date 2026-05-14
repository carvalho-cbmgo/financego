import { PageShell, Card } from "@/components/ui";
import { requireServerSession } from "@/lib/auth-server";
import { createUserDb } from "@/lib/user-db";
import { brl, monthRef } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function BudgetsPage() {
  const { user, accessToken } = await requireServerSession();
  const supabaseAdmin = createUserDb(accessToken);
  const ref = monthRef();
  const { data: budgets } = await supabaseAdmin.from("budgets").select("id, category, planned_amount").eq("profile_id", user.id).eq("month_ref", ref).order("category");
  const { data: monthTxs } = await supabaseAdmin.from("transactions").select("amount, app_category, posted_at, is_consolidated").gte("posted_at", `${ref}-01T00:00:00.000Z`);

  const spentByCategory = new Map<string, number>();
  for (const tx of (monthTxs || []) as any[]) {
    if (tx.is_consolidated !== false && Number(tx.amount) < 0) {
      const key = tx.app_category || "Outros";
      spentByCategory.set(key, (spentByCategory.get(key) || 0) + Math.abs(Number(tx.amount)));
    }
  }

  return (
    <PageShell>
      <div style={{ display: "grid", gap: 16, maxWidth: 1000 }}>
        <h1 style={{ margin: 0 }}>Orçamento mensal</h1>
        <Card title={`Planejamento de ${ref}`}><BudgetForm monthRefValue={ref} /></Card>
        <Card title="Resumo do orçamento">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><Th>Categoria</Th><Th>Planejado</Th><Th>Realizado</Th><Th>Consumo</Th></tr></thead>
            <tbody>
              {(budgets || []).map((item: any) => {
                const spent = spentByCategory.get(item.category) || 0;
                const pct = Number(item.planned_amount) > 0 ? (spent / Number(item.planned_amount)) * 100 : 0;
                return <tr key={item.id}><Td>{item.category}</Td><Td>{brl(item.planned_amount)}</Td><Td>{brl(spent)}</Td><Td>{pct.toFixed(1)}%</Td></tr>;
              })}
            </tbody>
          </table>
        </Card>
      </div>
    </PageShell>
  );
}

function BudgetForm({ monthRefValue }: { monthRefValue: string }) {
  const rows = ["Alimentação","Casa","Transporte","Saúde","Lazer","Outros"];
  return (
    <form action="/api/budgets/save" method="post" style={{ display: "grid", gap: 10 }}>
      <input type="hidden" name="month_ref" value={monthRefValue} />
      {rows.map((category) => (
        <div key={category} style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: 10 }}>
          <input name="category" value={category} readOnly style={readonlyInput} />
          <input name="planned_amount" type="number" step="0.01" placeholder={`Valor para ${category}`} style={editableInput} />
        </div>
      ))}
      <button style={buttonStyle}>Salvar orçamento</button>
    </form>
  );
}

const readonlyInput = { padding: "12px 10px", borderRadius: 10, border: "1px solid #d1d5db", background: "#f9fafb" };
const editableInput = { padding: "12px 10px", borderRadius: 10, border: "1px solid #d1d5db" };
const buttonStyle = { padding: "12px 16px", borderRadius: 12, border: "none", background: "#111827", color: "#fff", fontWeight: 700, marginTop: 6 };

function Th({ children }: any) { return <th style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid #ddd" }}>{children}</th>; }
function Td({ children }: any) { return <td style={{ padding: "10px 8px", borderBottom: "1px solid #eee" }}>{children}</td>; }
