import Link from "next/link";
import { PageShell, Card } from "@/components/ui";
import { requireServerSession } from "@/lib/auth-server";
import { createUserDb } from "@/lib/user-db";
import { brl, shortDate, monthRef } from "@/lib/format";
import { accountTypeLabel } from "@/lib/accounts";

export const dynamic = "force-dynamic";

type DashboardParams = {
  tab?: string;
  account_id?: string;
  bank_id?: string;
  edit_tx?: string;
};

export default async function DashboardPage({ searchParams }: { searchParams: Promise<DashboardParams> }) {
  const { user, accessToken } = await requireServerSession();
  const supabaseAdmin = createUserDb(accessToken);
  const params = await searchParams;

  const selectedAccountId = String(params.account_id || "");
  const selectedBankId = String(params.bank_id || "");
  const selectedEditTxId = String(params.edit_tx || "");
  const currentTab = params.tab === "transactions" ? "transactions" : "overview";

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
    .select("id, description, amount, posted_at, app_category, type, account_id, is_consolidated")
    .eq("profile_id", user.id)
    .order("posted_at", { ascending: false })
    .limit(240);

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

  const selectedAccounts = selectedAccountId
    ? (accounts || []).filter((a: any) => String(a.id) === selectedAccountId)
    : selectedBankId
      ? (accounts || []).filter((a: any) => String(a.bank_id || "") === selectedBankId)
      : (accounts || []);

  const saldo = selectedAccounts.reduce((sum: number, acc: any) => sum + Number(acc.balance || 0), 0);

  const consolidatedMonthTxs = (monthTxs || []).filter((t: any) => t.is_consolidated !== false);
  const plannedMonthTxs = (monthTxs || []).filter((t: any) => t.is_consolidated === false);

  const entradas = consolidatedMonthTxs.filter((t: any) => Number(t.amount) > 0).reduce((s: number, t: any) => s + Number(t.amount), 0);
  const saidas = consolidatedMonthTxs.filter((t: any) => Number(t.amount) < 0).reduce((s: number, t: any) => s + Math.abs(Number(t.amount)), 0);
  const saldoAnterior = saldo - (entradas - saidas);

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
    .slice(0, 8);

  const totalCategorySpent = categoryRows.reduce((sum, row) => sum + row.value, 0);

  const nowIso = new Date().toISOString();
  const nonConsolidatedPast = (txs || [])
    .filter((tx: any) => tx.is_consolidated === false && String(tx.posted_at || "") < nowIso)
    .sort((a: any, b: any) => String(b.posted_at).localeCompare(String(a.posted_at)))
    .slice(0, 9);

  const nonConsolidatedFuture = (txs || [])
    .filter((tx: any) => tx.is_consolidated === false && String(tx.posted_at || "") >= nowIso)
    .sort((a: any, b: any) => String(a.posted_at).localeCompare(String(b.posted_at)))
    .slice(0, 10);

  const alertFuture = nonConsolidatedFuture.filter((tx: any) => Math.abs(Number(tx.amount || 0)) >= 500).slice(0, 8);

  const returnParams = new URLSearchParams();
  returnParams.set("tab", "transactions");
  if (selectedBankId) returnParams.set("bank_id", selectedBankId);
  if (selectedAccountId) returnParams.set("account_id", selectedAccountId);
  const returnUrl = `/dashboard?${returnParams.toString()}`;

  const monthRefLabel = formatMonthRef(ref);
  const dateInfo = formatCurrentDateInfo();

  return (
    <PageShell>
      <div className="fg-legacy-grid">
        <aside className="fg-legacy-side">
          <div className="fg-legacy-side-title">Contas</div>
          <AccountsSidePanel accounts={accounts || []} bankById={bankById} selectedAccountId={selectedAccountId} />
        </aside>

        <section className="fg-stack">
          <LegacyToolbar
            monthRefLabel={monthRefLabel}
            currentTab={currentTab}
            selectedBankId={selectedBankId}
            selectedAccountId={selectedAccountId}
            banks={banks || []}
            accounts={accounts || []}
            dateInfo={dateInfo}
          />

          {currentTab === "transactions" ? (
            <>
              <Card title="Adicionar transacao" action={<span className="fg-chip">Clique na linha para editar</span>}>
                <ManualTransactionForm
                  accounts={accounts || []}
                  bankById={bankById}
                  returnUrl={returnUrl}
                  selectedAccountId={selectedAccountId}
                />
              </Card>

              <TransactionsTable
                txs={txs || []}
                banks={banks || []}
                accounts={accounts || []}
                accountById={accountById}
                bankById={bankById}
                returnUrl={returnUrl}
                selectedEditTxId={selectedEditTxId}
              />
            </>
          ) : (
            <div className="fg-overview-grid">
              <div className="fg-stack">
                <Card title="Entradas e saidas">
                  <div className="fg-checkbox-row"><input type="checkbox" checked readOnly /> Incluir saldo anterior</div>
                  <SummaryRow label="Saldo anterior" value={brl(saldoAnterior)} />
                  <SummaryRow label="Entradas" value={brl(entradas)} />
                  <SummaryRow label="Saidas" value={brl(-saidas)} tone="negative" />
                  <div className="fg-legacy-balance-total">{brl(saldo)}</div>
                </Card>

                <Card title="Despesas">
                  <CategoryCard rows={categoryRows} totalCategorySpent={totalCategorySpent} />
                </Card>

                <Card title="Saldo das contas">
                  <div className="fg-table-wrap">
                    <table className="fg-table">
                      <thead>
                        <tr>
                          <th>Conta</th>
                          <th>Banco</th>
                          <th>Saldo (R$)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedAccounts.slice(0, 12).map((acc: any) => {
                          const bank = bankById.get(String(acc.bank_id || ""));
                          return (
                            <tr key={acc.id}>
                              <td>{acc.name}</td>
                              <td>{bank?.name || acc.institution_name || "-"}</td>
                              <td>{brl(acc.balance || 0)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>

              <div className="fg-stack">
                <LegacyTxListCard title="Anteriores nao consolidadas" rows={nonConsolidatedPast} />
                <LegacyTxListCard title="Proximas nao consolidadas" rows={nonConsolidatedFuture} />
                <LegacyTxListCard title="Proximas com alerta" rows={alertFuture} />
              </div>
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}

function LegacyToolbar(input: {
  monthRefLabel: string;
  currentTab: "overview" | "transactions";
  selectedBankId: string;
  selectedAccountId: string;
  banks: any[];
  accounts: any[];
  dateInfo: { weekdayDate: string; accessText: string };
}) {
  return (
    <div className="fg-legacy-toolbar">
      <form action="/dashboard" method="get" className="fg-legacy-toolbar-left">
        <input type="hidden" name="tab" value={input.currentTab} />

        <div className="fg-legacy-month-chip">{input.monthRefLabel}</div>

        <select name="bank_id" defaultValue={input.selectedBankId} className="fg-select">
          <option value="">Todos os bancos</option>
          {input.banks.map((bank: any) => (
            <option key={bank.id} value={bank.id}>
              {bank.name}
            </option>
          ))}
        </select>

        <select name="account_id" defaultValue={input.selectedAccountId} className="fg-select">
          <option value="">Todas as contas</option>
          {input.accounts.map((account: any) => (
            <option key={account.id} value={account.id}>
              {account.name} ({accountTypeLabel(account.type)})
            </option>
          ))}
        </select>

        <button className="fg-btn-secondary">Aplicar</button>
      </form>

      <div className="fg-legacy-toolbar-right">
        <Link href="/dashboard?tab=transactions" className="fg-btn">+ Adicionar transacao</Link>
        <div className="fg-legacy-date-box">
          <strong>{input.dateInfo.weekdayDate}</strong>
          <span>{input.dateInfo.accessText}</span>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, tone }: { label: string; value: string; tone?: "negative" }) {
  return (
    <div className="fg-legacy-summary-row">
      <span>{label}</span>
      <strong className={tone === "negative" ? "fg-legacy-neg" : undefined}>{value}</strong>
    </div>
  );
}

function AccountsSidePanel(input: {
  accounts: any[];
  bankById: Map<string, any>;
  selectedAccountId: string;
}) {
  if (!input.accounts.length) return <div className="fg-empty">Sem contas.</div>;

  return (
    <div className="fg-account-list">
      {input.accounts.map((account: any) => {
        const bank = input.bankById.get(String(account.bank_id || ""));
        const bankName = bank?.name || account.institution_name || "Sem banco";
        const isActive = input.selectedAccountId === String(account.id);

        return (
          <Link
            key={account.id}
            href={`/dashboard?tab=overview&account_id=${account.id}`}
            className="fg-account-item"
            style={{ background: isActive ? "#e7f1cc" : "transparent" }}
          >
            <span className="fg-account-item-dot" aria-hidden="true" />
            <span>{accountTypeLabel(account.type)} {bankName}</span>
            <span className="fg-account-item-balance">{brl(account.balance || 0)}</span>
          </Link>
        );
      })}
    </div>
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
        <input name="description" required placeholder="Descricao" className="fg-input" />
        <input name="posted_at" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required className="fg-input" />
      </div>

      <div className="fg-grid-3">
        <input name="amount" type="number" step="0.01" required placeholder="Valor" className="fg-input" />
        <select name="action" defaultValue="Despesa" required className="fg-select">
          <option value="Receita">Receita</option>
          <option value="Despesa">Despesa</option>
          <option value="Transferência">Transferencia</option>
        </select>
        <input name="category" placeholder="Categoria" defaultValue="Outros" className="fg-input" />
      </div>

      <label className="fg-checkbox-row">
        <input name="is_consolidated" type="checkbox" defaultChecked />
        Consolidada
      </label>

      <button className="fg-btn">Salvar</button>
    </form>
  );
}

function CategoryCard({ rows, totalCategorySpent }: { rows: Array<{ category: string; value: number }>; totalCategorySpent: number }) {
  if (!rows.length) {
    return <div className="fg-empty">Sem despesas consolidadas.</div>;
  }

  const palette = ["#f0c532", "#0f8b8d", "#5f00a5", "#a6d8b8", "#f28f8f", "#0077b6", "#b00020", "#4cc38a"];
  let cursor = 0;

  const segments = rows.map((row, index) => {
    const pct = totalCategorySpent > 0 ? (row.value / totalCategorySpent) * 100 : 0;
    const start = cursor;
    const end = cursor + pct;
    cursor = end;
    return `${palette[index % palette.length]} ${start}% ${end}%`;
  });

  return (
    <div className="fg-legacy-expense-wrap">
      <div className="fg-legacy-expense-note">Todas as categorias</div>
      <div className="fg-legacy-pie" style={{ background: `conic-gradient(${segments.join(",")})` }} />
      <div className="fg-legacy-expense-list">
        {rows.slice(0, 6).map((row) => {
          const pct = totalCategorySpent > 0 ? (row.value / totalCategorySpent) * 100 : 0;
          return (
            <div key={row.category} className="fg-legacy-expense-item">
              <span>{row.category}</span>
              <span>{pct.toFixed(0)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LegacyTxListCard({ title, rows }: { title: string; rows: any[] }) {
  return (
    <Card title={title}>
      {rows.length ? (
        <div className="fg-table-wrap">
          <table className="fg-table">
            <thead>
              <tr>
                <th>Transacao</th>
                <th>Data</th>
                <th>Valor (R$)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((tx: any) => (
                <tr key={tx.id}>
                  <td>{tx.description || "-"}</td>
                  <td>{shortDate(tx.posted_at)}</td>
                  <td>{brl(tx.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="fg-empty">Nenhuma transacao.</div>
      )}
    </Card>
  );
}

function TransactionsTable(input: {
  txs: any[];
  banks: any[];
  accounts: any[];
  accountById: Map<string, any>;
  bankById: Map<string, any>;
  returnUrl: string;
  selectedEditTxId: string;
}) {
  if (!input.txs.length) {
    return (
      <Card title="Transacoes">
        <div className="fg-empty">Nenhuma transacao neste filtro.</div>
      </Card>
    );
  }

  return (
    <Card title="Transacoes" action={<span className="fg-chip">Clique na transacao para editar</span>}>
      <div className="fg-tx-list">
        {input.txs.map((tx: any) => {
          const txId = String(tx.id);
          const account = input.accountById.get(String(tx.account_id || ""));
          const bank = account ? input.bankById.get(String(account.bank_id || "")) : null;
          const bankName = bank?.name || account?.institution_name || "Sem banco";
          const selectedAccountId = String(tx.account_id || "") || String(input.accounts[0]?.id || "");
          const selectedBankId = String(account?.bank_id || input.banks[0]?.id || "");
          const editUrl = buildEditUrl(input.returnUrl, txId);
          const isEditing = input.selectedEditTxId === txId;

          return (
            <article key={txId} className="fg-tx-item">
              {isEditing ? (
                <div className="fg-tx-head">
                  <div className="fg-tx-main">
                    <div className="fg-tx-desc">{tx.description || "Sem descricao"}</div>
                    <div className="fg-tx-meta">
                      {shortDate(tx.posted_at)} - {bankName} - {account?.name || "Sem conta"}
                    </div>
                  </div>

                  <div className="fg-tx-side">
                    <div className={`fg-tx-amount ${Number(tx.amount) >= 0 ? "fg-tx-amount-in" : "fg-tx-amount-out"}`}>
                      {brl(tx.amount)}
                    </div>
                    <Link href={input.returnUrl} className="fg-icon-link" title="Fechar edicao">x</Link>
                  </div>
                </div>
              ) : (
                <Link href={editUrl} className="fg-tx-head-link" title="Editar transacao">
                  <div className="fg-tx-main">
                    <div className="fg-tx-desc">{tx.description || "Sem descricao"}</div>
                    <div className="fg-tx-meta">
                      {shortDate(tx.posted_at)} - {bankName} - {account?.name || "Sem conta"} - {tx.app_category || "Outros"}
                    </div>
                  </div>

                  <div className="fg-tx-side">
                    <div className={`fg-tx-amount ${Number(tx.amount) >= 0 ? "fg-tx-amount-in" : "fg-tx-amount-out"}`}>
                      {brl(tx.amount)}
                    </div>
                    <span className="fg-icon-link" aria-hidden="true">✎</span>
                  </div>
                </Link>
              )}

              {isEditing ? (
                <form action="/api/categories/update" method="post" className="fg-form fg-tx-edit-form">
                  <input type="hidden" name="id" value={txId} />
                  <input type="hidden" name="return_url" value={input.returnUrl} />

                  <div className="fg-grid-4">
                    <input name="posted_at" type="date" required defaultValue={toInputDate(tx.posted_at)} className="fg-input" />
                    <input name="description" required defaultValue={tx.description || ""} placeholder="Descricao" className="fg-input" />
                    <select name="bank_id" required defaultValue={selectedBankId} className="fg-select">
                      {input.banks.map((item: any) => (
                        <option key={item.id} value={item.id}>{item.name} {item.code ? `(${item.code})` : ""}</option>
                      ))}
                    </select>
                    <select name="account_id" required defaultValue={selectedAccountId} className="fg-select">
                      {input.accounts.map((item: any) => {
                        const accountBank = input.bankById.get(String(item.bank_id || ""));
                        const optionBankName = accountBank?.name || item.institution_name || "Sem banco";
                        return <option key={item.id} value={item.id}>{optionBankName} - {item.name} ({accountTypeLabel(item.type)})</option>;
                      })}
                    </select>
                  </div>

                  <div className="fg-grid-3">
                    <input name="category" required defaultValue={tx.app_category || "Outros"} placeholder="Categoria" className="fg-input" />
                    <input name="amount" type="number" step="0.01" required defaultValue={Math.abs(Number(tx.amount || 0)).toFixed(2)} placeholder="Valor" className="fg-input" />
                    <select name="action" required defaultValue={actionFromType(tx.type)} className="fg-select">
                      <option value="Receita">Receita</option>
                      <option value="Despesa">Despesa</option>
                      <option value="Transferência">Transferencia</option>
                    </select>
                  </div>

                  <label className="fg-checkbox-row">
                    <input name="is_consolidated" type="checkbox" defaultChecked={tx.is_consolidated !== false} />
                    Consolidada
                  </label>

                  <div className="fg-tx-edit-actions">
                    <button className="fg-btn-secondary">Salvar</button>
                    <Link href={input.returnUrl} className="fg-btn-secondary">Cancelar</Link>
                  </div>
                </form>
              ) : null}
            </article>
          );
        })}
      </div>
    </Card>
  );
}

function actionFromType(type: string | null | undefined) {
  if (type === "credit") return "Receita";
  if (type === "transfer") return "Transferência";
  return "Despesa";
}

function toInputDate(input?: string | null) {
  if (!input) return new Date().toISOString().slice(0, 10);
  return new Date(input).toISOString().slice(0, 10);
}

function buildEditUrl(baseUrl: string, txId: string) {
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}edit_tx=${txId}`;
}

function formatMonthRef(ref: string) {
  const [year, month] = ref.split("-");
  return `${month}/${year}`;
}

function formatCurrentDateInfo() {
  const now = new Date();
  const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(now);
  const date = new Intl.DateTimeFormat("pt-BR").format(now);
  const time = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(now);

  const weekdayDate = `${capitalize(weekday)}, ${date}`;
  const accessText = `Ultimo acesso: ${date} as ${time}`;

  return { weekdayDate, accessText };
}

function capitalize(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}
