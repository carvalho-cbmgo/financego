import { PageShell, Card, SectionIntro, Stat } from "@/components/ui";
import { BudgetsMonthPicker } from "@/components/budgets-month-picker";
import { BudgetsPlannerPanel } from "@/components/budgets-planner-panel";
import { requireServerSession } from "@/lib/auth-server";
import { createUserDb } from "@/lib/user-db";
import { ROOT_CATEGORY_NAME } from "@/lib/category-catalog";
import { brl, monthRef } from "@/lib/format";

export const dynamic = "force-dynamic";

type BudgetsParams = {
  month_ref?: string;
  ok?: string;
  error?: string;
};

export default async function BudgetsPage({ searchParams }: { searchParams: Promise<BudgetsParams> }) {
  const { user, accessToken } = await requireServerSession();
  const supabaseAdmin = createUserDb(accessToken);
  const params = await searchParams;

  const selectedMonthRef = normalizeMonthRef(String(params.month_ref || ""), monthRef());
  const monthStart = `${selectedMonthRef}-01T00:00:00.000Z`;
  const monthEnd = `${nextMonthRef(selectedMonthRef)}-01T00:00:00.000Z`;

  const [{ data: budgets }, { data: monthTxs }, { data: categories }] = await Promise.all([
    supabaseAdmin
      .from("budgets")
      .select("id, category, planned_amount")
      .eq("profile_id", user.id)
      .eq("month_ref", selectedMonthRef)
      .order("category"),
    supabaseAdmin
      .from("transactions")
      .select("amount, app_category, posted_at, is_consolidated")
      .eq("profile_id", user.id)
      .gte("posted_at", monthStart)
      .lt("posted_at", monthEnd),
    supabaseAdmin
      .from("categories")
      .select("name")
      .eq("profile_id", user.id),
  ]);

  const spentByCategory = new Map<string, number>();
  for (const tx of (monthTxs || []) as any[]) {
    if (tx.is_consolidated !== false && Number(tx.amount) < 0) {
      const key = normalizeCategoryName(tx.app_category);
      spentByCategory.set(key, (spentByCategory.get(key) || 0) + Math.abs(Number(tx.amount)));
    }
  }

  const availableCategories = buildAvailableCategories({
    categoryRows: categories || [],
    budgetRows: budgets || [],
    monthTxRows: monthTxs || [],
  });

  const budgetRows = (budgets || []).map((item: any) => {
    const category = normalizeCategoryName(item.category);
    const planned = Number(item.planned_amount || 0);
    const spent = spentByCategory.get(category) || 0;
    const remaining = planned - spent;
    const pct = planned > 0 ? (spent / planned) * 100 : 0;
    return { id: String(item.id), category, planned, spent, remaining, pct };
  });

  const plannedCategorySet = new Set(budgetRows.map((item) => item.category));
  const totalPlanned = budgetRows.reduce((sum, item) => sum + item.planned, 0);
  const totalSpent = budgetRows.reduce((sum, item) => sum + item.spent, 0);
  const totalRemaining = totalPlanned - totalSpent;
  const totalConsumptionPct = totalPlanned > 0 ? (totalSpent / totalPlanned) * 100 : 0;
  const unbudgetedSpent = Array.from(spentByCategory.entries())
    .filter(([category]) => !plannedCategorySet.has(category))
    .reduce((sum, [, value]) => sum + value, 0);
  const status = buildStatusMessage(params.ok, params.error);
  const returnUrl = `/budgets?month_ref=${encodeURIComponent(selectedMonthRef)}`;

  return (
    <PageShell>
      <div className="fg-stack fg-budgets-page">
        <SectionIntro
          title="Orcamento por categoria"
          subtitle="Escolha o mes de referencia, defina um limite mensal por categoria e acompanhe o consumo em R$ e percentual."
        />

        {status ? <div className={`fg-accounts-status ${status.tone === "error" ? "is-error" : "is-ok"}`}>{status.text}</div> : null}

        <Card title="Mes de referencia">
          <div className="fg-budgets-month-wrap">
            <BudgetsMonthPicker value={selectedMonthRef} />
          </div>
        </Card>

        <div className="fg-grid-4">
          <Stat label="Mes de referencia" value={selectedMonthRef} />
          <Stat label="Total orcado" value={brl(totalPlanned)} />
          <Stat label="Gasto nas categorias orcadas" value={brl(totalSpent)} tone="negative" />
          <Stat
            label="Saldo do mes orcado"
            value={brl(totalRemaining)}
            tone={totalRemaining >= 0 ? "positive" : "negative"}
          />
        </div>

        <div className="fg-split fg-budgets-main-grid">
          <Card title={`Planejamento de ${selectedMonthRef}`}>
            <BudgetsPlannerPanel
              key={selectedMonthRef}
              monthRef={selectedMonthRef}
              availableCategories={availableCategories}
              existingBudgets={budgetRows.map((item) => ({ category: item.category, plannedAmount: item.planned }))}
              returnUrl={returnUrl}
            />
          </Card>

          <Card title="Resumo mensal">
            <div className="fg-budgets-summary-stack">
              <SummaryRow label="Categorias orcadas" value={String(budgetRows.length)} />
              <SummaryRow label="Consumo medio das categorias orcadas" value={`${totalConsumptionPct.toFixed(1)}%`} />
              <SummaryRow label="Gasto fora do orcamento" value={brl(unbudgetedSpent)} />
            </div>
          </Card>
        </div>

        <Card title={`Monitoramento das categorias orcadas - ${selectedMonthRef}`}>
          <div className="fg-table-wrap">
            <table className="fg-table">
              <thead>
                <tr>
                  <th>Categoria</th>
                  <th>Orcamento (R$)</th>
                  <th>Gasto (R$)</th>
                  <th>Saldo (R$)</th>
                  <th>Consumo</th>
                </tr>
              </thead>
              <tbody>
                {budgetRows.length ? (
                  budgetRows.map((item) => {
                    const progress = Math.max(0, Math.min(item.pct, 100));
                    const progressClass = item.pct > 100 ? "is-over" : item.pct >= 85 ? "is-alert" : "is-ok";
                    return (
                      <tr key={item.id}>
                        <td>{item.category}</td>
                        <td>{brl(item.planned)}</td>
                        <td>{brl(item.spent)}</td>
                        <td className={item.remaining >= 0 ? "fg-legacy-value-pos" : "fg-legacy-value-neg"}>
                          {brl(item.remaining)}
                        </td>
                        <td>
                          <div className="fg-budgets-progress-cell">
                            <span>{item.pct.toFixed(1)}%</span>
                            <div className={`fg-budgets-progress ${progressClass}`}>
                              <div style={{ width: `${progress}%` }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5}>
                      Nenhuma categoria orcada neste mes. Selecione categorias no bloco acima e salve para iniciar o acompanhamento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}

function SummaryRow(input: { label: string; value: string }) {
  return (
    <div className="fg-legacy-summary-row">
      <span>{input.label}</span>
      <strong>{input.value}</strong>
    </div>
  );
}

function normalizeMonthRef(input: string, fallback: string) {
  const value = String(input || "").trim();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return fallback;
  return value;
}

function nextMonthRef(ref: string) {
  const [yearRaw, monthRaw] = ref.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return ref;

  const current = new Date(Date.UTC(year, month - 1, 1));
  current.setUTCMonth(current.getUTCMonth() + 1);
  const nextYear = current.getUTCFullYear();
  const nextMonth = String(current.getUTCMonth() + 1).padStart(2, "0");
  return `${nextYear}-${nextMonth}`;
}

function normalizeCategoryName(value: any) {
  const name = String(value || "").trim();
  if (!name || name === ROOT_CATEGORY_NAME) return "Outros";
  return name;
}

function buildAvailableCategories(input: {
  categoryRows: any[];
  budgetRows: any[];
  monthTxRows: any[];
}) {
  const set = new Set<string>();

  for (const row of input.categoryRows || []) {
    const name = String(row?.name || "").trim();
    if (!name || name === ROOT_CATEGORY_NAME) continue;
    set.add(name);
  }

  for (const row of input.budgetRows || []) {
    set.add(normalizeCategoryName(row?.category));
  }

  for (const row of input.monthTxRows || []) {
    set.add(normalizeCategoryName(row?.app_category));
  }

  set.add("Outros");
  return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function buildStatusMessage(okValue?: string, errorValue?: string) {
  const okMap: Record<string, string> = {
    saved: "Orcamento mensal salvo com sucesso.",
  };

  const errorMap: Record<string, string> = {
    invalid_month_ref: "Mes de referencia invalido.",
    save_failed: "Nao foi possivel salvar o orcamento agora.",
  };

  if (errorValue && errorMap[errorValue]) return { tone: "error" as const, text: errorMap[errorValue] };
  if (okValue && okMap[okValue]) return { tone: "ok" as const, text: okMap[okValue] };
  return null;
}
