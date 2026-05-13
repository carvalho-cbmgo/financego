import { PageShell, Card, Stat } from "@/components/ui";
import { requireServerSession } from "@/lib/auth-server";
import { createUserDb } from "@/lib/user-db";
import { brl, shortDate, monthRef } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { user, accessToken } = await requireServerSession();
  const supabaseAdmin = createUserDb(accessToken);
  const params = await searchParams;
  const { data: txs } = await supabaseAdmin.from("transactions").select("id, description, amount, posted_at, app_category, app_subcategory").eq("profile_id", user.id).order("posted_at", { ascending: false }).limit(30);
  const { data: accounts } = await supabaseAdmin.from("accounts").select("id, name, balance").eq("profile_id", user.id).order("created_at", { ascending: false });

  const ref = monthRef();
  const monthStart = `${ref}-01T00:00:00.000Z`;

  const { data: monthTxs } = await supabaseAdmin.from("transactions").select("id, amount, app_category, posted_at").eq("profile_id", user.id).gte("posted_at", monthStart);
  const { data: budgets } = await supabaseAdmin.from("budgets").select("category, planned_amount").eq("profile_id", user.id).eq("month_ref", ref);
  const { data: goals } = await supabaseAdmin.from("financial_goals").select("id, name, target_amount, current_amount").eq("profile_id", user.id).order("created_at", { ascending: false });

  const saldo = (accounts || []).reduce((sum: number, acc: any) => sum + Number(acc.balance || 0), 0);
  const receitas = (monthTxs || []).filter((t: any) => Number(t.amount) > 0).reduce((s: number, t: any) => s + Number(t.amount), 0);
  const gastos = (monthTxs || []).filter((t: any) => Number(t.amount) < 0).reduce((s: number, t: any) => s + Math.abs(Number(t.amount)), 0);
  const totalBudget = (budgets || []).reduce((s: number, b: any) => s + Number(b.planned_amount || 0), 0);
  const totalGoalsTarget = (goals || []).reduce((s: number, g: any) => s + Number(g.target_amount || 0), 0);
  const totalGoalsCurrent = (goals || []).reduce((s: number, g: any) => s + Number(g.current_amount || 0), 0);

  return (
    <PageShell>
      <div style={{ display: "grid", gap: 18 }}>
        <div>
          <h1 style={{ margin: 0 }}>Dashboard</h1>
          <p style={{ color: "#6b7280" }}>Visão geral financeira do mês atual.</p>
        </div>
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <Stat label="Saldo consolidado" value={brl(saldo)} />
          <Stat label="Receitas no mês" value={brl(receitas)} />
          <Stat label="Gastos no mês" value={brl(gastos)} />
          <Stat label="Orçamento do mês" value={brl(totalBudget)} />
          <Stat label="Patrimônio nas metas" value={brl(totalGoalsCurrent)} />
          <Stat label="Objetivo total" value={brl(totalGoalsTarget)} />
        </div>
        {params.tab === "transactions" ? <TransactionsTable txs={txs || []} /> : (
          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1.2fr .8fr" }}>
            <Card title="Últimas transações"><TransactionsMini txs={txs || []} /></Card>
            <Card title="Resumo das metas"><GoalsMini goals={goals || []} /></Card>
          </div>
        )}
      </div>
    </PageShell>
  );
}

function TransactionsMini({ txs }: { txs: any[] }) {
  if (!txs.length) return <div>Nenhuma transação ainda.</div>;
  return <div style={{ display: "grid", gap: 10 }}>{txs.map((tx: any) => (
    <div key={tx.id} style={{ display: "flex", justifyContent: "space-between", paddingBottom: 10, borderBottom: "1px solid #eee" }}>
      <div><div style={{ fontWeight: 700 }}>{tx.description || "Sem descrição"}</div><div style={{ color: "#6b7280", fontSize: 13 }}>{tx.app_category} • {shortDate(tx.posted_at)}</div></div>
      <div style={{ fontWeight: 700 }}>{brl(tx.amount)}</div>
    </div>
  ))}</div>;
}

function GoalsMini({ goals }: { goals: any[] }) {
  if (!goals.length) return <div>Nenhuma meta cadastrada.</div>;
  return <div style={{ display: "grid", gap: 12 }}>{goals.map((goal: any) => {
    const pct = Number(goal.target_amount) > 0 ? (Number(goal.current_amount) / Number(goal.target_amount)) * 100 : 0;
    return <div key={goal.id}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><strong>{goal.name}</strong><span>{pct.toFixed(1)}%</span></div>
      <div style={{ height: 10, background: "#e5e7eb", borderRadius: 999 }}><div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: "#111827", borderRadius: 999 }} /></div>
      <div style={{ marginTop: 6, color: "#6b7280", fontSize: 13 }}>{brl(goal.current_amount)} de {brl(goal.target_amount)}</div>
    </div>;
  })}</div>;
}

function TransactionsTable({ txs }: { txs: any[] }) {
  return (
    <Card title="Transações com categorização editável">
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><Th>Data</Th><Th>Descrição</Th><Th>Categoria</Th><Th>Subcategoria</Th><Th>Valor</Th><Th>Ação</Th></tr></thead>
          <tbody>
            {txs.map((tx: any) => (
              <tr key={tx.id}>
                <Td>{shortDate(tx.posted_at)}</Td>
                <Td>{tx.description || "-"}</Td>
                <Td>{tx.app_category || "-"}</Td>
                <Td>{tx.app_subcategory || "-"}</Td>
                <Td>{brl(tx.amount)}</Td>
                <Td><EditCategoryForm id={tx.id} category={tx.app_category || ""} subcategory={tx.app_subcategory || ""} /></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function EditCategoryForm({ id, category, subcategory }: { id: string; category: string; subcategory: string }) {
  return (
    <form action="/api/categories/update" method="post" style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <input type="hidden" name="id" defaultValue={id} />
      <input name="category" defaultValue={category} style={{ width: 110, padding: 6, border: "1px solid #ddd", borderRadius: 8 }} />
      <input name="subcategory" defaultValue={subcategory} style={{ width: 120, padding: 6, border: "1px solid #ddd", borderRadius: 8 }} />
      <button style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #ddd", background: "#fff" }}>Salvar</button>
    </form>
  );
}

function Th({ children }: any) { return <th style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid #ddd" }}>{children}</th>; }
function Td({ children }: any) { return <td style={{ padding: "10px 8px", borderBottom: "1px solid #eee", verticalAlign: "top" }}>{children}</td>; }
