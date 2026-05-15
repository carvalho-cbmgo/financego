import { PageShell, Card, SectionIntro, Stat } from "@/components/ui";
import { requireServerSession } from "@/lib/auth-server";
import { createUserDb } from "@/lib/user-db";
import { brl, shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const { user, accessToken } = await requireServerSession();
  const supabaseAdmin = createUserDb(accessToken);
  const { data: goals } = await supabaseAdmin
    .from("financial_goals")
    .select("id, name, target_amount, current_amount, target_date, notes")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  const totals = {
    target: (goals || []).reduce((sum: number, goal: any) => sum + Number(goal.target_amount || 0), 0),
    current: (goals || []).reduce((sum: number, goal: any) => sum + Number(goal.current_amount || 0), 0),
  };

  return (
    <PageShell>
      <div className="fg-stack" style={{ maxWidth: 1100 }}>
        <SectionIntro
          title="Metas financeiras"
          subtitle="Acompanhe evolucao de objetivos de curto e longo prazo com progresso visual."
        />

        <div className="fg-grid-4">
          <Stat label="Total de metas" value={String((goals || []).length)} />
          <Stat label="Valor alvo" value={brl(totals.target)} />
          <Stat label="Valor atual" value={brl(totals.current)} tone="positive" />
          <Stat
            label="Falta atingir"
            value={brl(Math.max(totals.target - totals.current, 0))}
            tone="negative"
          />
        </div>

        <Card title="Nova meta">
          <form action="/api/goals/save" method="post" className="fg-form">
            <input name="name" placeholder="Nome da meta" className="fg-input" />
            <div className="fg-grid-2">
              <input name="target_amount" type="number" step="0.01" placeholder="Valor-alvo" className="fg-input" />
              <input name="current_amount" type="number" step="0.01" placeholder="Valor atual" className="fg-input" />
            </div>
            <input name="target_date" type="date" className="fg-input" />
            <textarea name="notes" placeholder="Observacoes" className="fg-textarea" />
            <button className="fg-btn">Salvar meta</button>
          </form>
        </Card>

        <Card title="Lista de metas">
          {(goals || []).length ? (
            <div className="fg-grid-2">
              {(goals || []).map((goal: any) => {
                const pct = Number(goal.target_amount) > 0 ? (Number(goal.current_amount) / Number(goal.target_amount)) * 100 : 0;
                return (
                  <div key={goal.id} style={{ background: "#fff", border: "1px solid #dde4ef", borderRadius: 16, padding: 14 }}>
                    <div className="fg-category-row">
                      <strong>{goal.name}</strong>
                      <span>{pct.toFixed(1)}%</span>
                    </div>
                    <div className="fg-category-bar" style={{ marginTop: 10, height: 10 }}>
                      <span style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <div style={{ marginTop: 8, color: "#344154" }}>{brl(goal.current_amount)} de {brl(goal.target_amount)}</div>
                    <div className="fg-field-note" style={{ marginTop: 4 }}>Prazo: {shortDate(goal.target_date)}</div>
                    {goal.notes ? <div style={{ marginTop: 8, color: "#4d5a70" }}>{goal.notes}</div> : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="fg-empty">Nenhuma meta cadastrada.</div>
          )}
        </Card>
      </div>
    </PageShell>
  );
}

