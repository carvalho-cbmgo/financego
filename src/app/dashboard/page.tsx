import Link from "next/link";
import { PageShell, Card, Stat } from "@/components/ui";
import { requireServerSession } from "@/lib/auth-server";
import { createUserDb } from "@/lib/user-db";
import { brl, shortDate, monthRef } from "@/lib/format";
import { accountTypeLabel } from "@/lib/accounts";

export const dynamic = "force-dynamic";

type DashboardParams = {
  tab?: string;
  account_id?: string;
  bank?: string;
};

function normalize(input?: string | null) {
  return (input || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<DashboardParams> }) {
  const { user, accessToken } = await requireServerSession();
  const supabaseAdmin = createUserDb(accessToken);
  const params = await searchParams;

  const selectedAccountId = String(params.account_id || "");
  const selectedBank = String(params.bank || "");

  const { data: accounts } = await supabaseAdmin
    .from("accounts")
    .select("id, name, balance, institution_name, type")
    .eq("profile_id", user.id)
    .order("institution_name")
    .order("created_at", { ascending: false });

  const accountById = new Map<string, any>((accounts || []).map((acc: any) => [String(acc.id), acc]));
  const bankOptions = Array.from(new Set((accounts || []).map((acc: any) => String(acc.institution_name || "").trim()).filter(Boolean)));

  const bankMatchedAccountIds = selectedBank
    ? (accounts || [])
      .filter((acc: any) => normalize(acc.institution_name) === normalize(selectedBank))
      .map((acc: any) => String(acc.id))
    : [];

  let txQuery = supabaseAdmin
    .from("transactions")
    .select("id, description, amount, posted_at, app_category, app_subcategory, type, account_id, bank_key, is_consolidated")
    .eq("profile_id", user.id)
    .order("posted_at", { ascending: false })
    .limit(80);

  if (selectedAccountId) {
    txQuery = txQuery.eq("account_id", selectedAccountId);
  } else if (selectedBank) {
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
  } else if (selectedBank) {
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
    : selectedBank
      ? (accounts || []).filter((a: any) => normalize(a.institution_name) === normalize(selectedBank))
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

  const returnParams = new URLSearchParams();
  returnParams.set("tab", "transactions");
  if (selectedBank) returnParams.set("bank", selectedBank);
  if (selectedAccountId) returnParams.set("account_id", selectedAccountId);
  const returnUrl = `/dashboard?${returnParams.toString()}`;

  return (
    <PageShell>
      <div style={{ display: "grid", gap: 18 }}>
        <div>
          <h1 style={{ margin: 0 }}>Dashboard</h1>
          <p style={{ color: "#6b7280" }}>
            Visao geral do mes atual com filtros por banco e conta.
          </p>
        </div>

        <FilterForm
          selectedBank={selectedBank}
          selectedAccountId={selectedAccountId}
          bankOptions={bankOptions}
          accounts={accounts || []}
        />

        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <Stat label="Saldo das contas no filtro" value={brl(saldo)} />
          <Stat label="Receitas consolidadas (mes)" value={brl(receitas)} />
          <Stat label="Despesas consolidadas (mes)" value={brl(gastos)} />
          <Stat label="Despesas previstas (nao consol.)" value={brl(gastosPrevistos)} />
          <Stat label="Orcamento do mes" value={brl(totalBudget)} />
          <Stat label="Patrimonio nas metas" value={brl(totalGoalsCurrent)} />
          <Stat label="Objetivo total" value={brl(totalGoalsTarget)} />
        </div>

        {params.tab === "transactions" ? (
          <>
            {(accounts || []).length ? (
              <Card title="Lancar transacao manual (permite previsao de gasto futuro)">
                <ManualTransactionForm accounts={accounts || []} returnUrl={returnUrl} selectedAccountId={selectedAccountId} />
              </Card>
            ) : (
              <Card title="Cadastre uma conta para registrar transacoes">
                <p style={{ marginTop: 0 }}>Nenhuma conta encontrada para este usuario.</p>
                <Link href="/accounts">Ir para cadastro de contas</Link>
              </Card>
            )}

            <TransactionsTable txs={txs || []} accounts={accounts || []} accountById={accountById} returnUrl={returnUrl} />
          </>
        ) : (
          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1.2fr .8fr" }}>
            <Card title="Ultimas transacoes">
              <TransactionsMini txs={txs || []} accountById={accountById} />
            </Card>
            <Card title="Resumo das metas">
              <GoalsMini goals={goals || []} />
            </Card>
          </div>
        )}
      </div>
    </PageShell>
  );
}

function FilterForm(input: { selectedBank: string; selectedAccountId: string; bankOptions: string[]; accounts: any[] }) {
  return (
    <Card title="Filtros de analise">
      <form action="/dashboard" method="get" style={{ display: "grid", gap: 10 }}>
        <input type="hidden" name="tab" value="transactions" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10 }}>
          <select name="bank" defaultValue={input.selectedBank} style={inputStyle}>
            <option value="">Todos os bancos</option>
            {input.bankOptions.map((bank) => (
              <option key={bank} value={bank}>{bank}</option>
            ))}
          </select>

          <select name="account_id" defaultValue={input.selectedAccountId} style={inputStyle}>
            <option value="">Todas as contas</option>
            {input.accounts.map((account: any) => (
              <option key={account.id} value={account.id}>
                {account.institution_name} - {account.name} ({accountTypeLabel(account.type)})
              </option>
            ))}
          </select>

          <button style={buttonLight}>Aplicar</button>
        </div>
      </form>
    </Card>
  );
}

function ManualTransactionForm(input: { accounts: any[]; returnUrl: string; selectedAccountId: string }) {
  return (
    <form action="/api/transactions/save" method="post" style={{ display: "grid", gap: 10 }}>
      <input type="hidden" name="return_url" value={input.returnUrl} />

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 1fr", gap: 10 }}>
        <select name="account_id" required defaultValue={input.selectedAccountId || String(input.accounts[0]?.id || "")} style={inputStyle}>
          {input.accounts.map((account: any) => (
            <option key={account.id} value={account.id}>
              {account.institution_name} - {account.name} ({accountTypeLabel(account.type)})
            </option>
          ))}
        </select>
        <input name="description" required placeholder="Descricao da transacao" style={inputStyle} />
        <input name="posted_at" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required style={inputStyle} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "180px 180px 1fr 1fr", gap: 10 }}>
        <input name="amount" type="number" step="0.01" required placeholder="Valor" style={inputStyle} />
        <select name="action" defaultValue="Despesa" style={inputStyle}>
          <option value="Receita">Receita</option>
          <option value="Despesa">Despesa</option>
          <option value="Transferência">Transferência</option>
        </select>
        <input name="category" placeholder="Categoria" defaultValue="Outros" style={inputStyle} />
        <input name="subcategory" placeholder="Subcategoria" defaultValue="Nao classificado" style={inputStyle} />
      </div>

      <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <input name="is_consolidated" type="checkbox" defaultChecked />
        Consolidada (desmarque para registrar como NAO CONSOLIDADA e prever gasto futuro)
      </label>

      <button style={buttonDark}>Salvar transacao</button>
    </form>
  );
}

function TransactionsMini({ txs, accountById }: { txs: any[]; accountById: Map<string, any> }) {
  if (!txs.length) return <div>Nenhuma transacao ainda.</div>;

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {txs.map((tx: any) => {
        const account = accountById.get(String(tx.account_id || ""));

        return (
          <div key={tx.id} style={{ display: "flex", justifyContent: "space-between", paddingBottom: 10, borderBottom: "1px solid #eee" }}>
            <div>
              <div style={{ fontWeight: 700 }}>{tx.description || "Sem descricao"}</div>
              <div style={{ color: "#6b7280", fontSize: 13 }}>
                {(account?.institution_name || "Sem banco")} - {(account?.name || "Sem conta")} - {shortDate(tx.posted_at)}
              </div>
            </div>
            <div style={{ fontWeight: 700 }}>{brl(tx.amount)}</div>
          </div>
        );
      })}
    </div>
  );
}

function GoalsMini({ goals }: { goals: any[] }) {
  if (!goals.length) return <div>Nenhuma meta cadastrada.</div>;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {goals.map((goal: any) => {
        const pct = Number(goal.target_amount) > 0 ? (Number(goal.current_amount) / Number(goal.target_amount)) * 100 : 0;

        return (
          <div key={goal.id}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <strong>{goal.name}</strong>
              <span>{pct.toFixed(1)}%</span>
            </div>
            <div style={{ height: 10, background: "#e5e7eb", borderRadius: 999 }}>
              <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: "#111827", borderRadius: 999 }} />
            </div>
            <div style={{ marginTop: 6, color: "#6b7280", fontSize: 13 }}>
              {brl(goal.current_amount)} de {brl(goal.target_amount)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TransactionsTable(input: { txs: any[]; accounts: any[]; accountById: Map<string, any>; returnUrl: string }) {
  return (
    <Card title="Transacoes por conta, banco, acao e consolidacao">
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <Th>Data</Th>
              <Th>Descricao</Th>
              <Th>Banco</Th>
              <Th>Conta</Th>
              <Th>Categoria</Th>
              <Th>Subcategoria</Th>
              <Th>Valor</Th>
              <Th>Acao</Th>
              <Th>Consolidada</Th>
              <Th>Salvar</Th>
            </tr>
          </thead>
          <tbody>
            {input.txs.map((tx: any) => {
              const formId = `tx-form-${tx.id}`;
              const account = input.accountById.get(String(tx.account_id || ""));
              const selectedAccountId = String(tx.account_id || "") || String(input.accounts[0]?.id || "");

              return (
                <tr key={tx.id}>
                  <Td>{shortDate(tx.posted_at)}</Td>
                  <Td>{tx.description || "-"}</Td>
                  <Td>{account?.institution_name || "-"}</Td>
                  <Td>
                    <select form={formId} name="account_id" required defaultValue={selectedAccountId} style={{ width: 220, ...compactInput }}>
                      {input.accounts.map((a: any) => (
                        <option key={a.id} value={a.id}>
                          {a.institution_name} - {a.name} ({accountTypeLabel(a.type)})
                        </option>
                      ))}
                    </select>
                  </Td>
                  <Td>
                    <input form={formId} name="category" defaultValue={tx.app_category || ""} style={{ width: 120, ...compactInput }} />
                  </Td>
                  <Td>
                    <input form={formId} name="subcategory" defaultValue={tx.app_subcategory || ""} style={{ width: 130, ...compactInput }} />
                  </Td>
                  <Td>{brl(tx.amount)}</Td>
                  <Td>
                    <select form={formId} name="action" required defaultValue={actionFromType(tx.type)} style={{ width: 140, ...compactInput }}>
                      <option value="Receita">Receita</option>
                      <option value="Despesa">Despesa</option>
                      <option value="Transferência">Transferência</option>
                    </select>
                  </Td>
                  <Td>
                    <input form={formId} name="is_consolidated" type="checkbox" defaultChecked={tx.is_consolidated !== false} />
                  </Td>
                  <Td>
                    <form id={formId} action="/api/categories/update" method="post" style={{ display: "inline-flex" }}>
                      <input type="hidden" name="id" value={tx.id} />
                      <input type="hidden" name="return_url" value={input.returnUrl} />
                    </form>
                    <button form={formId} style={buttonLight}>Salvar</button>
                  </Td>
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

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "10px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
};

const compactInput = {
  padding: 6,
  borderRadius: 8,
  border: "1px solid #ddd",
};

const buttonDark = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "none",
  background: "#111827",
  color: "#fff",
  fontWeight: 700,
};

const buttonLight = {
  padding: "7px 10px",
  borderRadius: 8,
  border: "1px solid #ddd",
  background: "#fff",
};

function Th({ children }: any) {
  return <th style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid #ddd" }}>{children}</th>;
}

function Td({ children }: any) {
  return <td style={{ padding: "10px 8px", borderBottom: "1px solid #eee", verticalAlign: "top" }}>{children}</td>;
}
