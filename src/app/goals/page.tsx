import { PageShell, Card } from "@/components/ui";
import { requireServerSession } from "@/lib/auth-server";
import { createUserDb } from "@/lib/user-db";
import { brl, shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const { user, accessToken } = await requireServerSession();
  const supabaseAdmin = createUserDb(accessToken);
  const { data: goals } = await supabaseAdmin.from("financial_goals").select("id, name, target_amount, current_amount, target_date, notes").eq("profile_id", user.id).order("created_at", { ascending: false });

  return (
    <PageShell>
      <div style={{ display: "grid", gap: 16, maxWidth: 1000 }}>
        <h1 style={{ margin: 0 }}>Metas financeiras</h1>
        <Card title="Nova meta">
          <form action="/api/goals/save" method="post" style={{ display: "grid", gap: 10 }}>
            <input name="name" placeholder="Nome da meta" style={inputStyle} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <input name="target_amount" type="number" step="0.01" placeholder="Valor-alvo" style={inputStyle} />
              <input name="current_amount" type="number" step="0.01" placeholder="Valor atual" style={inputStyle} />
            </div>
            <input name="target_date" type="date" style={inputStyle} />
            <textarea name="notes" placeholder="Observações" style={{ ...inputStyle, minHeight: 90 }} />
            <button style={buttonStyle}>Salvar meta</button>
          </form>
        </Card>
        <Card title="Lista de metas">
          <div style={{ display: "grid", gap: 12 }}>
            {(goals || []).map((goal: any) => {
              const pct = Number(goal.target_amount) > 0 ? (Number(goal.current_amount) / Number(goal.target_amount)) * 100 : 0;
              return <div key={goal.id} style={{ border: "1px solid #eee", borderRadius: 12, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><strong>{goal.name}</strong><span>{pct.toFixed(1)}%</span></div>
                <div style={{ height: 10, background: "#e5e7eb", borderRadius: 999, marginTop: 10 }}><div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: "#111827", borderRadius: 999 }} /></div>
                <div style={{ marginTop: 8, color: "#374151" }}>{brl(goal.current_amount)} de {brl(goal.target_amount)}</div>
                <div style={{ color: "#6b7280", fontSize: 13 }}>Prazo: {shortDate(goal.target_date)}</div>
                {goal.notes ? <div style={{ marginTop: 6, color: "#4b5563" }}>{goal.notes}</div> : null}
              </div>;
            })}
          </div>
        </Card>
      </div>
    </PageShell>
  );
}

const inputStyle = { padding: "12px 10px", borderRadius: 10, border: "1px solid #d1d5db", width: "100%", boxSizing: "border-box" as const };
const buttonStyle = { padding: "12px 16px", borderRadius: 12, border: "none", background: "#111827", color: "#fff", fontWeight: 700 };
