import Link from "next/link";
import { PageShell, Card, Stat, SectionIntro } from "@/components/ui";
import { requireServerSession } from "@/lib/auth-server";
import { createUserDb } from "@/lib/user-db";
import { brl, shortDate, monthRef } from "@/lib/format";
import { accountTypeLabel } from "@/lib/accounts";

export const dynamic = "force-dynamic";

type DashboardParams = {
  tab?: string;
  account_id?: string;
  bank_id?: string;
};

export default async function DashboardPage({ searchParams }: { searchParams: Promise<DashboardParams> }) {
  const { user, accessToken } = await requireServerSession();
  const supabaseAdmin = createUserDb(accessToken);
  const params = await searchParams;

  const selectedAccountId = String(params.account_id || "");
  const selectedBankId = String(params.bank_id || "");

  const [{ data: banks }, { data: accounts }] = await Promise.all([
    supabaseAdmin
      .from("banks")
      .select("id, name, code")
      .eq("profile_id", user.id)
      .order("name"),
    supabaseAdmin
      .from("accounts")
      .select("id, bank_id, name, balance, institution_name, type")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const bankById = new Map<string, any>((banks || []).map((bank: any) => [String(bank.id), bank]));
  const accountById = new Map<string, any>((accounts || []).map((acc: any) => [String(acc.id), acc]));

  const bankMatchedAccountIds = selectedBankId
    ? (accounts || [])
      .filter((acc: any) => String(acc.bank_id || "") === selectedBankId)
      .map((acc: any) => String(acc.id))
    : [];

  let txQuery = supabaseAdmin
    .from("transactions")
    .select("id, description, amount, posted_at, app_category, app_subcategory, type, account_id, is_consolidated")
    .eq("profile_id", user.id)
    .order("posted_at", { ascending: false })
    .limit(80);

  if (selectedAccountId) {
    txQuery = txQuery.eq("account_id", selectedAccountId);
  } else if (selectedBankId) {
    if (bankMatchedAccountIds.length) txQuery = txQuery.in("account_id", bankMatchedAccountIds);
    else txQuery = txQuery.eq("account_id", "00000000-0000-0000-0000-000000000000");
  }

  const { data: txs } = await txQuery;

  const ref = monthRef();
  const monthStart = `${ref}-01T00:00:00.000Z`;

  let monthTxQuery = supabaseAdmin
    .from("transactions")
    .select("id, amount, app_category, posted_at, is_consolidated, account_id")
    .eq("profile_id", user.id)
    .gte("posted_at", monthStart);

  if (selectedAccountId) {
    monthTxQuery = monthTxQuery.eq("account_id", selectedAccountId);
  } else if (selectedBankId) {
    if (bankMatchedAccountIds.length) monthTxQuery = monthTxQuery.in("account_id", bankMatchedAccountIds);
    else monthTxQuery = monthTxQuery.eq("account_id", "00000000-0000-0000-0000-000000000000");
  }

  const { data: monthTxs } = await monthTxQuery;

  const { data: budgets } = await supabaseAdmin
    .from("budgets")
    .select("category, planned_amount")
    .eq("profile_id", user.id)
    .eq("month_ref", ref);

  const { data: goals } = await supabaseAdmin
    .from("financial_goals")
    .select("id, name, target_amount, current_amount")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  const selectedAccounts = selectedAccountId
    ? (accounts || []).filter((a: any) => String(a.id) === selectedAccountId)
    : selectedBankId
      ? (accounts || []).filter((a: any) => String(a.bank_id || "") === selectedBankId)
      : (accounts || []);

  const saldo = selectedAccounts.reduce((sum: number, acc: any) => sum + Number(acc.balance || 0), 0);

  const consolidatedMonthTxs = (monthTxs || []).filter((t: any) => t.is_consolidated !== false);
  const plannedMonthTxs = (monthTxs || []).filter((t: any) => t.is_consolidated === false);

  const receitas = consolidatedMonthTxs.filter((t: any) => Number(t.amount) > 0).reduce((s: number, t: any) => s + Number(t.amount), 0);
  const gastos = consolidatedMonthTxs.filter((t: any) => Number(t.amount) < 0).reduce((s: number, t: any) => s + Math.abs(Number(t.amount)), 0);
  const gastosPrevistos = plannedMonthTxs.filter((t: any) => Number(t.amount) < 0).reduce((s: number, t: any) => s + Math.abs(Number(t.amount)), 0);

  const totalBudget = (budgets || []).reduce((s: number, b: any) => s + Number(b.planned_amount || 0), 0);
  const totalGoalsTarget = (goals || []).reduce((s: number, g: any) => s + Number(g.target_amount || 0), 0);
  const totalGoalsCurrent = (goals || []).reduce((s: number, g: any) => s + Number(g.current_amount || 0), 0);

  const categorySpentMap = new Map<string, number>();
  for (const tx of consolidatedMonthTxs) {
    const amount = Number(tx.amount || 0);
    if (amount < 0) {
      const key = tx.app_category || "Outros";
      categorySpentMap.set(key, (categorySpentMap.get(key) || 0) + Math.abs(amount));
    }
  }

  const categoryRows = Array.from(categorySpentMap.entries())
    .map(([category, value]) => ({ category, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const totalCategorySpent = categoryRows.reduce((sum, row) => sum + row.value, 0);

  const returnParams = new URLSearchParams();
  returnParams.set("tab", "transactions");
  if (selectedBankId) returnParams.set("bank_id", selectedBankId);
  if (selectedAccountId) returnParams.set("account_id", selectedAccountId);
  const returnUrl = `/dashboard?${returnParams.toString()}`;

  const resultMonth = receitas - gastos;
  const projectedResult = receitas - gastos - gastosPrevistos;

  return (
    <PageShell>
      <div className="fg-stack">
        <SectionIntro
          title="Painel Finance GO"
          subtitle="Visao geral das suas financas por banco e por conta, com despesas consolidadas e previsoes futuras."
          action={<Link href="/accounts" className="fg-link">Gerenciar bancos e contas</Link>}
        />

        <FilterForm
          currentTab={params.tab === "transactions" ? "transactions" : "overview"}
          selectedBankId={selectedBankId}
          selectedAccountId={selectedAccountId}
          banks={banks || []}
          accounts={accounts || []}
        />

        {!accounts?.length ? (
          <Card title="Primeiro passo">
            <div className="fg-empty">
              Nenhuma conta cadastrada ainda. Crie seu banco e sua conta para registrar transacoes.
              <div style={{ marginTop: 10 }}>
                <Link href="/accounts" className="fg-link">Ir para bancos e contas</Link>
              </div>
            </div>
          </Card>
        ) : null}

        <div className="fg-grid-4">
          <Stat label="Saldo atual" value={brl(saldo)} tone={saldo >= 0 ? "positive" : "negative"} />
          <Stat label="Entradas consolidadas" value={brl(receitas)} tone="positive" />
          <Stat label="Saidas consolidadas" value={brl(gastos)} tone="negative" />
          <Stat label="Saidas previstas" value={brl(gastosPrevistos)} tone="negative" />
        </div>

        {params.tab === "transactions" ? (
          <>
            <Card title="Registrar transacao" action={<span className="fg-chip">Acoes: Receita, Despesa ou Transferencia</span>}>
              <ManualTransactionForm
                accounts={accounts || []}
                bankById={bankById}
                returnUrl={returnUrl}
                selectedAccountId={selectedAccountId}
              />
            </Card>

            <TransactionsTable
              txs={txs || []}
              accounts={accounts || []}
              accountById={accountById}
              bankById={bankById}
              returnUrl={returnUrl}
            />
          </>
        ) : (
          <>
            <div className="fg-split">
              <div className="fg-stack">
                <Card title="Saldo">
                  <div style={{ fontSize: 42, fontWeight: 800, fontFamily: "var(--font-heading)" }}>{brl(saldo)}</div>
                </Card>

                <Card title="Gastos por categoria">
                  <CategoryCard rows={categoryRows} totalCategorySpent={totalCategorySpent} monthRefValue={ref} />
                </Card>

                <Card title="Ultimas transacoes" action={<Link href="/dashboard?tab=transactions" className="fg-link">Ver extrato completo</Link>}>
                  <TransactionsMini txs={txs || []} accountById={accountById} bankById={bankById} />
                </Card>
              </div>

              <div className="fg-stack">
                <Card title="Desempenho">
                  <PerformanceCard
                    resultMonth={resultMonth}
                    projectedResult={projectedResult}
                    receitas={receitas}
                    gastos={gastos}
                    gastosPrevistos={gastosPrevistos}
                  />
                </Card>

                <Card title="Orcamento e metas">
                  <div className="fg-stack" style={{ gap: 10 }}>
                    <div className="fg-category-row">
                      <span>Orcamento planejado</span>
                      <strong>{brl(totalBudget)}</strong>
                    </div>
                    <div className="fg-category-row">
                      <span>Meta acumulada</span>
                      <strong>{brl(totalGoalsCurrent)}</strong>
                    </div>
                    <div className="fg-category-row">
                      <span>Meta total</span>
                      <strong>{brl(totalGoalsTarget)}</strong>
                    </div>
                    <Link href="/goals" className="fg-link">Gerenciar metas</Link>
                  </div>
                </Card>
              </div>
            </div>

            <Card title="Lista de metas">
              <GoalsMini goals={goals || []} />
            </Card>
          </>
        )}
      </div>
    </PageShell>
  );
}

function FilterForm(input: {
  currentTab: "transactions" | "overview";
  selectedBankId: string;
  selectedAccountId: string;
  banks: any[];
  accounts: any[];
}) {
  return (
    <Card title="Filtro de visao">
      <form action="/dashboard" method="get" className="fg-form">
        <input type="hidden" name="tab" value={input.currentTab} />
        <div className="fg-grid-3">
          <select name="bank_id" defaultValue={input.selectedBankId} className="fg-select">
            <option value="">Todos os bancos</option>
            {input.banks.map((bank: any) => (
              <option key={bank.id} value={bank.id}>
                {bank.name} {bank.code ? `(${bank.code})` : ""}
              </option>
            ))}
          </select>

          <select name="account_id" defaultValue={input.selectedAccountId} className="fg-select">
            <option value="">Todas as contas</option>
            {input.accounts.map((account: any) => (
              <option key={account.id} value={account.id}>
                {account.institution_name} - {account.name} ({accountTypeLabel(account.type)})
              </option>
            ))}
          </select>

          <button className="fg-btn-secondary">Aplicar filtro</button>
        </div>
      </form>
    </Card>
  );
}

function ManualTransactionForm(input: { accounts: any[]; bankById: Map<string, any>; returnUrl: string; selectedAccountId: string }) {
  return (
    <form action="/api/transactions/save" method="post" className="fg-form">
      <input type="hidden" name="return_url" value={input.returnUrl} />

      <div className="fg-grid-3">
        <select name="account_id" required defaultValue={input.selectedAccountId || String(input.accounts[0]?.id || "")} className="fg-select">
          {input.accounts.map((account: any) => {
            const bank = input.bankById.get(String(account.bank_id || ""));
            const bankName = bank?.name || account.institution_name || "Sem banco";

            return (
              <option key={account.id} value={account.id}>
                {bankName} - {account.name} ({accountTypeLabel(account.type)})
              </option>
            );
          })}
        </select>
        <input name="description" required placeholder="Descricao da transacao" className="fg-input" />
        <input name="posted_at" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required className="fg-input" />
      </div>

      <div className="fg-grid-4">
        <input name="amount" type="number" step="0.01" required placeholder="Valor" className="fg-input" />
        <select name="action" defaultValue="Despesa" required className="fg-select">
          <option value="Receita">Receita</option>
          <option value="Despesa">Despesa</option>
          <option value="Transferência">Transferencia</option>
        </select>
        <input name="category" placeholder="Categoria" defaultValue="Outros" className="fg-input" />
        <input name="subcategory" placeholder="Subcategoria" defaultValue="Nao classificado" className="fg-input" />
      </div>

      <label className="fg-checkbox-row">
        <input name="is_consolidated" type="checkbox" defaultChecked />
        Consolidada (desmarque para registrar como NAO CONSOLIDADA)
      </label>

      <button className="fg-btn">Salvar transacao</button>
    </form>
  );
}

function CategoryCard({ rows, totalCategorySpent, monthRefValue }: { rows: Array<{ category: string; value: number }>; totalCategorySpent: number; monthRefValue: string }) {
  if (!rows.length) {
    return <div className="fg-empty">Ainda nao existem despesas consolidadas neste mes.</div>;
  }

  const palette = ["#16a36f", "#f97316", "#6b7280", "#2d6cdf", "#c21f73", "#7c3aed"];
  let cursor = 0;
  const segments = rows.map((row, index) => {
    const pct = totalCategorySpent > 0 ? (row.value / totalCategorySpent) * 100 : 0;
    const start = cursor;
    const end = cursor + pct;
    cursor = end;
    return `${palette[index % palette.length]} ${start}% ${end}%`;
  });

  const donutBackground = `conic-gradient(${segments.join(",")})`;

  return (
    <div className="fg-split" style={{ gridTemplateColumns: "1fr 210px", alignItems: "center" }}>
      <div className="fg-stack" style={{ gap: 8 }}>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>Total de gastos do mes</div>
        <div style={{ fontSize: 34, fontWeight: 800, color: "var(--danger)", fontFamily: "var(--font-heading)" }}>{brl(totalCategorySpent)}</div>

        {rows.map((row) => {
          const pct = totalCategorySpent > 0 ? (row.value / totalCategorySpent) * 100 : 0;
          return (
            <div key={row.category} className="fg-stack" style={{ gap: 6 }}>
              <div className="fg-category-row">
                <span>{row.category}</span>
                <strong>{pct.toFixed(1)}%</strong>
              </div>
              <div className="fg-category-bar">
                <span style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          width: 184,
          height: 184,
          borderRadius: "50%",
          background: donutBackground,
          display: "grid",
          placeItems: "center",
          justifySelf: "center",
        }}
      >
        <div
          style={{
            width: 122,
            height: 122,
            borderRadius: "50%",
            background: "var(--panel-soft)",
            border: "1px solid var(--line)",
            display: "grid",
            placeItems: "center",
            textAlign: "center",
            fontWeight: 700,
            color: "#384153",
          }}
        >
          {monthRefValue}
        </div>
      </div>
    </div>
  );
}

function PerformanceCard(input: { resultMonth: number; projectedResult: number; receitas: number; gastos: number; gastosPrevistos: number }) {
  const totalOut = input.gastos + input.gastosPrevistos;
  const maxBar = Math.max(input.receitas, totalOut, 1);
  const inHeight = Math.max(16, (input.receitas / maxBar) * 170);
  const outHeight = Math.max(16, (totalOut / maxBar) * 170);

  return (
    <div className="fg-stack" style={{ gap: 12 }}>
      <div style={{ fontSize: 15, color: "var(--muted)" }}>Resultado do mes</div>
      <div style={{ fontSize: 42, fontWeight: 800, fontFamily: "var(--font-heading)", color: input.resultMonth >= 0 ? "#129464" : "var(--danger)" }}>
        {brl(input.resultMonth)}
      </div>

      <div className="fg-category-row">
        <span>Entradas</span>
        <strong style={{ color: "#129464" }}>{brl(input.receitas)}</strong>
      </div>
      <div className="fg-category-row">
        <span>Saidas + previsao</span>
        <strong style={{ color: "var(--danger)" }}>{brl(totalOut)}</strong>
      </div>
      <div className="fg-category-row">
        <span>Resultado projetado</span>
        <strong>{brl(input.projectedResult)}</strong>
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, height: 190, paddingTop: 6 }}>
        <div style={{ display: "grid", justifyItems: "center", gap: 6 }}>
          <div style={{ width: 52, height: inHeight, borderRadius: 10, background: "#16a36f" }} />
          <span style={{ fontSize: 12, fontWeight: 700 }}>Entradas</span>
        </div>
        <div style={{ display: "grid", justifyItems: "center", gap: 6 }}>
          <div style={{ width: 52, height: outHeight, borderRadius: 10, background: "#c21f73" }} />
          <span style={{ fontSize: 12, fontWeight: 700 }}>Saidas</span>
        </div>
      </div>
    </div>
  );
}

function TransactionsMini({ txs, accountById, bankById }: { txs: any[]; accountById: Map<string, any>; bankById: Map<string, any> }) {
  if (!txs.length) return <div className="fg-empty">Nenhuma transacao encontrada neste filtro.</div>;

  return (
    <div className="fg-stack" style={{ gap: 8 }}>
      {txs.slice(0, 8).map((tx: any) => {
        const account = accountById.get(String(tx.account_id || ""));
        const bank = account ? bankById.get(String(account.bank_id || "")) : null;
        const bankName = bank?.name || account?.institution_name || "Sem banco";

        return (
          <div key={tx.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, paddingBottom: 10, borderBottom: "1px solid #dce2ed" }}>
            <div>
              <div style={{ fontWeight: 700 }}>{tx.description || "Sem descricao"}</div>
              <div style={{ color: "var(--muted)", fontSize: 13 }}>
                {bankName} - {account?.name || "Sem conta"} - {shortDate(tx.posted_at)}
              </div>
            </div>
            <div style={{ fontWeight: 800, color: Number(tx.amount) >= 0 ? "#12895d" : "var(--danger)" }}>{brl(tx.amount)}</div>
          </div>
        );
      })}
    </div>
  );
}

function GoalsMini({ goals }: { goals: any[] }) {
  if (!goals.length) return <div className="fg-empty">Nenhuma meta cadastrada.</div>;

  return (
    <div className="fg-stack" style={{ gap: 10 }}>
      {goals.map((goal: any) => {
        const pct = Number(goal.target_amount) > 0 ? (Number(goal.current_amount) / Number(goal.target_amount)) * 100 : 0;

        return (
          <div key={goal.id} style={{ background: "#fff", border: "1px solid #dce3ef", borderRadius: 14, padding: 12 }}>
            <div className="fg-category-row" style={{ marginBottom: 6 }}>
              <strong>{goal.name}</strong>
              <span>{pct.toFixed(1)}%</span>
            </div>
            <div className="fg-category-bar" style={{ height: 10 }}>
              <span style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <div style={{ marginTop: 7, color: "#455064", fontSize: 13 }}>
              {brl(goal.current_amount)} de {brl(goal.target_amount)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TransactionsTable(input: {
  txs: any[];
  accounts: any[];
  accountById: Map<string, any>;
  bankById: Map<string, any>;
  returnUrl: string;
}) {
  return (
    <Card title="Transacoes por banco e conta" action={<span className="fg-chip">Edite categoria, acao e consolidacao</span>}>
      <div className="fg-table-wrap">
        <table className="fg-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Descricao</th>
              <th>Banco</th>
              <th>Conta</th>
              <th>Categoria</th>
              <th>Subcategoria</th>
              <th>Valor</th>
              <th>Acao</th>
              <th>Consolidada</th>
              <th>Salvar</th>
            </tr>
          </thead>
          <tbody>
            {input.txs.map((tx: any) => {
              const formId = `tx-form-${tx.id}`;
              const account = input.accountById.get(String(tx.account_id || ""));
              const bank = account ? input.bankById.get(String(account.bank_id || "")) : null;
              const bankName = bank?.name || account?.institution_name || "-";
              const selectedAccountId = String(tx.account_id || "") || String(input.accounts[0]?.id || "");

              return (
                <tr key={tx.id}>
                  <td>{shortDate(tx.posted_at)}</td>
                  <td>{tx.description || "-"}</td>
                  <td>{bankName}</td>
                  <td>
                    <select form={formId} name="account_id" required defaultValue={selectedAccountId} className="fg-select" style={{ minWidth: 220 }}>
                      {input.accounts.map((a: any) => (
                        <option key={a.id} value={a.id}>
                          {a.institution_name} - {a.name} ({accountTypeLabel(a.type)})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input form={formId} name="category" defaultValue={tx.app_category || ""} className="fg-input" />
                  </td>
                  <td>
                    <input form={formId} name="subcategory" defaultValue={tx.app_subcategory || ""} className="fg-input" />
                  </td>
                  <td style={{ fontWeight: 800, color: Number(tx.amount) >= 0 ? "#12895d" : "var(--danger)" }}>{brl(tx.amount)}</td>
                  <td>
                    <select form={formId} name="action" required defaultValue={actionFromType(tx.type)} className="fg-select">
                      <option value="Receita">Receita</option>
                      <option value="Despesa">Despesa</option>
                      <option value="Transferência">Transferencia</option>
                    </select>
                  </td>
                  <td>
                    <input form={formId} name="is_consolidated" type="checkbox" defaultChecked={tx.is_consolidated !== false} />
                  </td>
                  <td>
                    <form id={formId} action="/api/categories/update" method="post" style={{ display: "inline-flex" }}>
                      <input type="hidden" name="id" value={tx.id} />
                      <input type="hidden" name="return_url" value={input.returnUrl} />
                    </form>
                    <button form={formId} className="fg-btn-secondary">Salvar</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function actionFromType(type: string | null | undefined) {
  if (type === "credit") return "Receita";
  if (type === "transfer") return "Transferência";
  return "Despesa";
}

