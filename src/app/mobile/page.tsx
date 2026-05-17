import { MobileDrawerHeader } from "@/components/mobile-drawer-header";
import { requireServerSession } from "@/lib/auth-server";
import { createUserDb } from "@/lib/user-db";
import { brl, monthRef, shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

type MobileParams = {
  month_ref?: string;
};

type TxRow = {
  id: string;
  description: string | null;
  amount: number | null;
  posted_at: string | null;
  app_category: string | null;
  type: string | null;
  is_consolidated: boolean | null;
};

type CategoryRow = {
  category: string;
  value: number;
};

const CATEGORY_COLORS = ["#6f5b7d", "#c69587", "#9f9acc", "#6aa4cf", "#8ab88d"];

export default async function MobilePage({ searchParams }: { searchParams: Promise<MobileParams> }) {
  const { user, accessToken } = await requireServerSession();
  const supabaseAdmin = createUserDb(accessToken);
  const params = await searchParams;

  const selectedMonthRef = normalizeMonthRef(String(params.month_ref || ""), monthRef());
  const nextMonth = shiftMonthRef(selectedMonthRef, 1);
  const previousMonth = shiftMonthRef(selectedMonthRef, -1);
  const monthStart = `${selectedMonthRef}-01T00:00:00.000Z`;
  const monthEnd = `${nextMonth}-01T00:00:00.000Z`;
  const previousMonthStart = `${previousMonth}-01T00:00:00.000Z`;

  const [monthTxResponse, previousBalanceResponse, previousMonthTxResponse] = await Promise.all([
    supabaseAdmin
      .from("transactions")
      .select("id, description, amount, posted_at, app_category, type, is_consolidated")
      .eq("profile_id", user.id)
      .gte("posted_at", monthStart)
      .lt("posted_at", monthEnd)
      .order("posted_at", { ascending: true }),
    supabaseAdmin
      .from("transactions")
      .select("amount")
      .eq("profile_id", user.id)
      .lt("posted_at", monthStart),
    supabaseAdmin
      .from("transactions")
      .select("amount, type, is_consolidated")
      .eq("profile_id", user.id)
      .gte("posted_at", previousMonthStart)
      .lt("posted_at", monthStart),
  ]);

  const monthTxs = (monthTxResponse.data || []) as TxRow[];
  const consolidatedMonthTxs = monthTxs.filter((tx) => tx.is_consolidated !== false);
  const pendingMonthTxs = monthTxs
    .filter((tx) => tx.is_consolidated === false)
    .sort((a, b) => String(a.posted_at || "").localeCompare(String(b.posted_at || "")));
  const latestMonthTxs = [...monthTxs]
    .sort((a, b) => String(b.posted_at || "").localeCompare(String(a.posted_at || "")))
    .slice(0, 6);

  const previousBalance = (previousBalanceResponse.data || []).reduce((sum, row: { amount: number | null }) => {
    return sum + toAmount(row.amount);
  }, 0);

  const entradas = consolidatedMonthTxs
    .filter((tx) => isRevenueTx(tx))
    .reduce((sum, tx) => sum + Math.abs(toAmount(tx.amount)), 0);
  const saidasAbs = consolidatedMonthTxs
    .filter((tx) => isExpenseTx(tx))
    .reduce((sum, tx) => sum + Math.abs(toAmount(tx.amount)), 0);
  const resultadoMes = entradas - saidasAbs;
  const saldoContas = previousBalance + consolidatedMonthTxs.reduce((sum, tx) => sum + toAmount(tx.amount), 0);

  const previousMonthTxs = (previousMonthTxResponse.data || []) as Array<{
    amount: number | null;
    type: string | null;
    is_consolidated: boolean | null;
  }>;
  const previousMonthExpenses = previousMonthTxs
    .filter((tx) => tx.is_consolidated !== false && isExpenseTx(tx))
    .reduce((sum, tx) => sum + Math.abs(toAmount(tx.amount)), 0);
  const expenseComparisonPercent =
    previousMonthExpenses > 0 ? ((saidasAbs - previousMonthExpenses) / previousMonthExpenses) * 100 : null;
  const expensesReduced = expenseComparisonPercent !== null ? expenseComparisonPercent < 0 : null;

  const categoryRows = buildCategoryRows(consolidatedMonthTxs);
  const totalCategorySpent = categoryRows.reduce((sum, row) => sum + row.value, 0);
  const donutSegments = buildDonutSegments(categoryRows, totalCategorySpent);

  const dailyBalances = buildDailyBalances({
    monthRef: selectedMonthRef,
    openingBalance: previousBalance,
    txs: consolidatedMonthTxs,
  });
  const sparkline = buildSparkline(dailyBalances);
  const profileLabel = formatProfileLabel(user.email, user.id);
  const lastSyncText = `Sincronizado em ${formatSyncDate(new Date())}`;

  return (
    <main className="fg-mobile-screen">
      <MobileDrawerHeader monthRef={selectedMonthRef} profileLabel={profileLabel} lastSyncText={lastSyncText} />

      <section className="fg-mobile-content">
        <div className="fg-mobile-chip-row">
          <a href="#ultimas-alteracoes" className="fg-mobile-chip">Ultimas alteracoes</a>
          <a href="#nao-consolidadas" className="fg-mobile-chip">Nao consolidadas ({pendingMonthTxs.length})</a>
        </div>

        <section id="saldo-das-contas" className="fg-mobile-section">
          <h3 className="fg-mobile-section-title">Saldo das contas</h3>
          <article className="fg-mobile-card fg-mobile-card-balance">
            <div className="fg-mobile-balance-value">{brl(saldoContas)}</div>
            <div className="fg-mobile-balance-subtitle">Saldo em {formatMonthEndDate(selectedMonthRef)}</div>
          </article>
        </section>

        <section className="fg-mobile-section">
          <h3 className="fg-mobile-section-title">Resultado do periodo</h3>
          <article className="fg-mobile-card">
            <div className="fg-mobile-result-row">
              <span>Entradas</span>
              <strong>{brl(entradas)}</strong>
            </div>
            <div className="fg-mobile-result-row">
              <span>Saidas</span>
              <strong>{brl(-saidasAbs)}</strong>
            </div>
            <div className="fg-mobile-result-total">
              <strong className={resultadoMes < 0 ? "is-negative" : "is-positive"}>{brl(resultadoMes)}</strong>
            </div>
          </article>
        </section>

        <section className="fg-mobile-section">
          <h3 className="fg-mobile-section-title">Comparativo de saidas</h3>
          <article className="fg-mobile-card fg-mobile-compare-card">
            <div className="fg-mobile-compare-left">
              <div className="fg-mobile-compare-value">{brl(-previousMonthExpenses)}</div>
              <div className="fg-mobile-compare-label">{labelMonth(previousMonth)}</div>
            </div>
            <div className="fg-mobile-compare-center">
              {expenseComparisonPercent === null ? (
                <>
                  <div className="fg-mobile-compare-pct">0%</div>
                  <div className="fg-mobile-compare-note">sem base de comparacao</div>
                </>
              ) : (
                <>
                  <div className="fg-mobile-compare-pct">{Math.abs(expenseComparisonPercent).toFixed(0)}%</div>
                  <div className="fg-mobile-compare-note">
                    {expensesReduced ? "reducao de saidas" : "aumento de saidas"}
                  </div>
                </>
              )}
            </div>
            <div className="fg-mobile-compare-right">
              <div className="fg-mobile-compare-value">{brl(-saidasAbs)}</div>
              <div className="fg-mobile-compare-label">{labelMonth(selectedMonthRef)}</div>
            </div>
          </article>
        </section>

        <section id="grafico-mensal" className="fg-mobile-section">
          <h3 className="fg-mobile-section-title">Fluxo de caixa</h3>
          <article className="fg-mobile-card">
            <div className="fg-mobile-chart-wrap">
              <svg viewBox="0 0 320 170" className="fg-mobile-chart" role="img" aria-label="Grafico de fluxo de caixa">
                {[0, 1, 2, 3].map((line) => (
                  <line
                    key={line}
                    x1="14"
                    x2="306"
                    y1={20 + line * 44}
                    y2={20 + line * 44}
                    className="fg-mobile-chart-grid"
                  />
                ))}
                <polyline points={sparkline.points} className="fg-mobile-chart-line" />
              </svg>
            </div>
            <div className="fg-mobile-chart-labels">
              <span>{sparkline.startLabel}</span>
              <span>{sparkline.midLabel}</span>
              <span>{sparkline.endLabel}</span>
            </div>
          </article>
        </section>

        <section id="extrato-mensal" className="fg-mobile-section">
          <h3 className="fg-mobile-section-title">Extrato mensal</h3>
          <article className="fg-mobile-card">
            {monthTxs.length ? (
              <ul className="fg-mobile-tx-list">
                {[...monthTxs]
                  .sort((a, b) => String(b.posted_at || "").localeCompare(String(a.posted_at || "")))
                  .slice(0, 80)
                  .map((tx) => (
                    <li key={tx.id} className={`fg-mobile-tx-item ${tx.is_consolidated === false ? "is-pending" : ""}`}>
                      <div>
                        <div className="fg-mobile-tx-desc">{safeText(tx.description, "Transacao")}</div>
                        <div className="fg-mobile-tx-meta">
                          {shortDate(tx.posted_at)} - {safeText(tx.app_category, "Outros")}
                        </div>
                      </div>
                      <strong className={toAmount(tx.amount) < 0 ? "is-negative" : "is-positive"}>{brl(tx.amount || 0)}</strong>
                    </li>
                  ))}
              </ul>
            ) : (
              <div className="fg-mobile-empty">Sem transacoes no mes selecionado.</div>
            )}
          </article>
        </section>

        <section className="fg-mobile-section">
          <h3 className="fg-mobile-section-title">Despesas por categoria</h3>
          <article className="fg-mobile-card">
            {categoryRows.length ? (
              <div className="fg-mobile-category-layout">
                <div
                  className="fg-mobile-donut"
                  style={{ background: `conic-gradient(${donutSegments.join(", ")})` }}
                  aria-label="Grafico de categorias"
                />
                <div className="fg-mobile-category-list">
                  {categoryRows.map((row) => {
                    const percent = totalCategorySpent > 0 ? (row.value / totalCategorySpent) * 100 : 0;
                    return (
                      <div key={row.category} className="fg-mobile-category-item">
                        <span className="fg-mobile-category-name">{row.category}</span>
                        <span className="fg-mobile-category-value">{percent.toFixed(0)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="fg-mobile-empty">Sem despesas consolidadas no mes.</div>
            )}
          </article>
        </section>

        <section id="ultimas-alteracoes" className="fg-mobile-section">
          <h3 className="fg-mobile-section-title">Ultimas alteracoes</h3>
          <article className="fg-mobile-card">
            {latestMonthTxs.length ? (
              <ul className="fg-mobile-tx-list">
                {latestMonthTxs.map((tx) => (
                  <li key={tx.id} className="fg-mobile-tx-item">
                    <div>
                      <div className="fg-mobile-tx-desc">{safeText(tx.description, "Transacao")}</div>
                      <div className="fg-mobile-tx-meta">{shortDate(tx.posted_at)}</div>
                    </div>
                    <strong className={toAmount(tx.amount) < 0 ? "is-negative" : "is-positive"}>{brl(tx.amount || 0)}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="fg-mobile-empty">Nenhuma transacao no periodo.</div>
            )}
          </article>
        </section>

        <section id="nao-consolidadas" className="fg-mobile-section">
          <h3 className="fg-mobile-section-title">Nao consolidadas</h3>
          <article className="fg-mobile-card">
            {pendingMonthTxs.length ? (
              <ul className="fg-mobile-tx-list">
                {pendingMonthTxs.map((tx) => (
                  <li key={tx.id} className="fg-mobile-tx-item is-pending">
                    <div>
                      <div className="fg-mobile-tx-desc">{safeText(tx.description, "Transacao pendente")}</div>
                      <div className="fg-mobile-tx-meta">{shortDate(tx.posted_at)}</div>
                    </div>
                    <strong className={toAmount(tx.amount) < 0 ? "is-negative" : "is-positive"}>{brl(tx.amount || 0)}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="fg-mobile-empty">Todas as transacoes do mes estao consolidadas.</div>
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

function shiftMonthRef(ref: string, delta: number) {
  const [yearRaw, monthRaw] = ref.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return ref;

  const date = new Date(Date.UTC(year, month - 1, 1));
  date.setUTCMonth(date.getUTCMonth() + delta);
  const nextYear = date.getUTCFullYear();
  const nextMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${nextYear}-${nextMonth}`;
}

function toAmount(value: number | string | null | undefined) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount : 0;
}

function normalizeTxType(input?: string | null) {
  return String(input || "").trim().toLowerCase();
}

function isRevenueTx(tx: { type: string | null | undefined; amount: number | string | null | undefined }) {
  const type = normalizeTxType(tx.type);
  if (type === "credit") return true;
  if (type === "transfer") return false;
  return toAmount(tx.amount) > 0;
}

function isExpenseTx(tx: { type: string | null | undefined; amount: number | string | null | undefined }) {
  const type = normalizeTxType(tx.type);
  if (type === "debit") return true;
  if (type === "transfer") return false;
  return toAmount(tx.amount) < 0;
}

function buildCategoryRows(txs: Array<Pick<TxRow, "app_category" | "amount" | "type">>): CategoryRow[] {
  const categoryMap = new Map<string, number>();
  for (const tx of txs) {
    if (!isExpenseTx(tx)) continue;
    const value = Math.abs(toAmount(tx.amount));
    if (!value) continue;
    const category = String(tx.app_category || "").trim() || "Outros";
    categoryMap.set(category, (categoryMap.get(category) || 0) + value);
  }

  const sorted = Array.from(categoryMap.entries())
    .map(([category, value]) => ({ category, value }))
    .sort((a, b) => b.value - a.value);

  if (sorted.length <= 4) return sorted;
  const topRows = sorted.slice(0, 4);
  const remainder = sorted.slice(4).reduce((sum, row) => sum + row.value, 0);
  if (remainder > 0) topRows.push({ category: "Outras categorias", value: remainder });
  return topRows;
}

function buildDonutSegments(categoryRows: CategoryRow[], totalSpent: number) {
  if (!categoryRows.length || totalSpent <= 0) {
    return ["#d3d7df 0% 100%"];
  }

  let cursor = 0;
  return categoryRows.map((row, index) => {
    const pct = (row.value / totalSpent) * 100;
    const start = cursor;
    const end = Math.min(100, cursor + pct);
    cursor = end;
    return `${CATEGORY_COLORS[index % CATEGORY_COLORS.length]} ${start}% ${end}%`;
  });
}

function buildDailyBalances(input: { monthRef: string; openingBalance: number; txs: Array<Pick<TxRow, "amount" | "posted_at">> }) {
  const [yearRaw, monthRaw] = input.monthRef.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const days = daysInMonth(year, month);
  const movementByDay = new Array<number>(days).fill(0);

  for (const tx of input.txs) {
    if (!tx.posted_at) continue;
    const date = new Date(tx.posted_at);
    if (Number.isNaN(date.getTime())) continue;
    const day = date.getUTCDate();
    if (day < 1 || day > days) continue;
    movementByDay[day - 1] += toAmount(tx.amount);
  }

  let runningBalance = input.openingBalance;
  const balances: number[] = [];
  for (let i = 0; i < days; i += 1) {
    runningBalance += movementByDay[i];
    balances.push(runningBalance);
  }
  return balances;
}

function buildSparkline(values: number[]) {
  const safeValues = values.length ? values : [0];
  const width = 320;
  const height = 170;
  const pad = 16;
  const min = Math.min(...safeValues);
  const max = Math.max(...safeValues);
  const range = max - min || 1;
  const divisor = Math.max(1, safeValues.length - 1);

  const points = safeValues
    .map((value, index) => {
      const x = pad + (index / divisor) * (width - pad * 2);
      const y = pad + ((max - value) / range) * (height - pad * 2);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  const midPoint = Math.max(1, Math.round(safeValues.length / 2));
  return {
    points,
    startLabel: "01",
    midLabel: String(midPoint).padStart(2, "0"),
    endLabel: String(safeValues.length).padStart(2, "0"),
  };
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function formatMonthEndDate(ref: string) {
  const [yearRaw, monthRaw] = ref.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return "-";
  const date = new Date(Date.UTC(year, month, 0));
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long" }).format(date);
}

function labelMonth(ref: string) {
  const [yearRaw, monthRaw] = ref.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return ref;
  const names = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
  return `${names[Math.max(0, month - 1)]} ${String(year).slice(-2)}`;
}

function safeText(input: string | null | undefined, fallback: string) {
  const value = String(input || "").trim();
  return value || fallback;
}

function formatProfileLabel(email: string | null | undefined, userId: string) {
  const seed = String(email || "").trim() || userId.slice(0, 12);
  if (seed.length <= 22) return seed;
  return `${seed.slice(0, 22)}...`;
}

function formatSyncDate(date: Date) {
  const dayMonth = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" })
    .format(date)
    .replace(".", "")
    .toLowerCase();
  const hour = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date);
  return `${dayMonth}, ${hour}`;
}
