import { PageShell, Card } from "@/components/ui";
import { AccountsFilterPanel } from "@/components/accounts-filter-panel";
import { CategoryTreePanel } from "@/components/category-tree-panel";
import { TransactionsTable } from "@/components/transactions-table";
import { MonthRefPicker } from "@/components/month-ref-picker";
import { PreviousBalanceToggle } from "@/components/previous-balance-toggle";
import { requireServerSession } from "@/lib/auth-server";
import { createUserDb } from "@/lib/user-db";
import { brl, shortDate, monthRef } from "@/lib/format";
import { accountTypeLabel } from "@/lib/accounts";
import { ROOT_CATEGORY_NAME } from "@/lib/category-catalog";
import { buildCategoryGroups } from "@/lib/category-tree";

export const dynamic = "force-dynamic";

type DashboardParams = {
  tab?: string;
  account_id?: string;
  account_ids?: string;
  bank_id?: string;
  category?: string;
  categories?: string;
  month_ref?: string;
  include_previous_balance?: string;
  edit_tx?: string;
};

type CategorySelectOption = {
  value: string;
  label: string;
  depth: number;
};

function normalizeLookup(input?: string | null) {
  return String(input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<DashboardParams> }) {
  const { user, accessToken } = await requireServerSession();
  const supabaseAdmin = createUserDb(accessToken);
  const params = await searchParams;

  const selectedAccountId = String(params.account_id || "");
  const selectedAccountIds = parseCsvList(params.account_ids);
  if (!selectedAccountIds.length && selectedAccountId) selectedAccountIds.push(selectedAccountId);
  const selectedBankId = String(params.bank_id || "");
  const selectedCategoryNames = Array.from(
    new Set([
      ...parseCsvList(params.categories),
      ...parseCsvList(params.category),
    ]),
  );
  const selectedMonthRef = normalizeMonthRef(String(params.month_ref || ""), monthRef());
  const includePreviousBalance = String(params.include_previous_balance || "1") !== "0";
  const selectedEditTxId = String(params.edit_tx || "");
  const currentTab = params.tab === "transactions" ? "transactions" : "overview";
  const applyBankFilterInTransactions = false;
  const monthStart = `${selectedMonthRef}-01T00:00:00.000Z`;
  const monthEnd = `${nextMonthRef(selectedMonthRef)}-01T00:00:00.000Z`;

  const [{ data: banks }, { data: accounts }, categoriesCatalogResponse, accountBalancesResponse] = await Promise.all([
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
    supabaseAdmin
      .from("categories")
      .select("id, name, parent_id")
      .eq("profile_id", user.id),
    supabaseAdmin
      .from("transactions")
      .select("account_id, amount")
      .eq("profile_id", user.id),
  ]);

  const categoriesCatalog = categoriesCatalogResponse.error
    ? []
    : buildCategoryCatalog(categoriesCatalogResponse.data || []);
  const accountBalanceById = new Map<string, number>();
  for (const row of accountBalancesResponse.data || []) {
    const accountId = String((row as any)?.account_id || "").trim();
    if (!accountId) continue;
    const amount = Number((row as any)?.amount || 0);
    if (!Number.isFinite(amount)) continue;
    accountBalanceById.set(accountId, (accountBalanceById.get(accountId) || 0) + amount);
  }

  const bankById = new Map<string, any>((banks || []).map((bank: any) => [String(bank.id), bank]));
  const accountById = new Map<string, any>((accounts || []).map((acc: any) => [String(acc.id), acc]));

  const bankMatchedAccountIds = selectedBankId
    ? (accounts || [])
      .filter((acc: any) => String(acc.bank_id || "") === selectedBankId)
      .map((acc: any) => String(acc.id))
    : [];

  let previousBalanceQuery = supabaseAdmin
    .from("transactions")
    .select("amount")
    .eq("profile_id", user.id)
    .lt("posted_at", monthStart);

  if (selectedAccountIds.length) {
    previousBalanceQuery = previousBalanceQuery.in("account_id", selectedAccountIds);
  } else if (selectedBankId) {
    if (bankMatchedAccountIds.length) previousBalanceQuery = previousBalanceQuery.in("account_id", bankMatchedAccountIds);
    else previousBalanceQuery = previousBalanceQuery.eq("account_id", "00000000-0000-0000-0000-000000000000");
  }

  const { data: previousBalanceRows } = await previousBalanceQuery;
  const previousBalance = (previousBalanceRows || []).reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0);

  let txQuery = supabaseAdmin
    .from("transactions")
    .select("id, description, amount, posted_at, app_category, type, account_id, is_consolidated, installment_current, installment_total, installment_group_key, raw")
    .eq("profile_id", user.id)
    .order("posted_at", { ascending: false })
    .limit(240);

  if (selectedAccountIds.length) {
    txQuery = txQuery.in("account_id", selectedAccountIds);
  } else if (selectedBankId && (currentTab !== "transactions" || applyBankFilterInTransactions)) {
    if (bankMatchedAccountIds.length) txQuery = txQuery.in("account_id", bankMatchedAccountIds);
    else txQuery = txQuery.eq("account_id", "00000000-0000-0000-0000-000000000000");
  }

  if (currentTab === "transactions") {
    txQuery = txQuery.gte("posted_at", monthStart).lt("posted_at", monthEnd);
  }

  const { data: txRows } = await txQuery;
  const selectedCategoryLookup = new Set(selectedCategoryNames.map((name) => normalizeLookup(name)).filter(Boolean));
  const txs = currentTab === "transactions" && selectedCategoryLookup.size
    ? (txRows || []).filter((tx: any) => selectedCategoryLookup.has(normalizeLookup(tx.app_category || "Outros")))
    : (txRows || []);

  let categoryGroups = buildCategoryGroups([]);
  if (currentTab === "transactions") {
    let categoryTreeQuery = supabaseAdmin
      .from("transactions")
      .select("app_category, amount")
      .eq("profile_id", user.id)
      .gte("posted_at", monthStart)
      .lt("posted_at", monthEnd);

    if (selectedAccountIds.length) {
      categoryTreeQuery = categoryTreeQuery.in("account_id", selectedAccountIds);
    } else if (selectedBankId && applyBankFilterInTransactions) {
      if (bankMatchedAccountIds.length) categoryTreeQuery = categoryTreeQuery.in("account_id", bankMatchedAccountIds);
      else categoryTreeQuery = categoryTreeQuery.eq("account_id", "00000000-0000-0000-0000-000000000000");
    }

    const { data: categoryTreeTxs } = await categoryTreeQuery;
    categoryGroups = buildCategoryGroups(categoryTreeTxs || []);
  }

  let monthTxQuery = supabaseAdmin
    .from("transactions")
    .select("id, amount, app_category, posted_at, is_consolidated, account_id, type")
    .eq("profile_id", user.id)
    .gte("posted_at", monthStart)
    .lt("posted_at", monthEnd);

  if (selectedAccountIds.length) {
    monthTxQuery = monthTxQuery.in("account_id", selectedAccountIds);
  } else if (selectedBankId) {
    if (bankMatchedAccountIds.length) monthTxQuery = monthTxQuery.in("account_id", bankMatchedAccountIds);
    else monthTxQuery = monthTxQuery.eq("account_id", "00000000-0000-0000-0000-000000000000");
  }

  const { data: monthTxs } = await monthTxQuery;

  const categoryOptions = buildCategorySelectOptions({
    categoriesCatalog,
    extraNames: [
      ...(monthTxs || []).map((tx: any) => String(tx.app_category || "Outros").trim()),
      ...(txs || []).map((tx: any) => String(tx.app_category || "Outros").trim()),
      "Outros",
    ],
  });

  const selectedAccounts = selectedAccountIds.length
    ? (accounts || []).filter((a: any) => selectedAccountIds.includes(String(a.id)))
    : selectedBankId
      ? (accounts || []).filter((a: any) => String(a.bank_id || "") === selectedBankId)
      : (accounts || []);
  const consolidatedMonthTxs = (monthTxs || []).filter((t: any) => t.is_consolidated !== false);
  const plannedMonthTxs = (monthTxs || []).filter((t: any) => t.is_consolidated === false);

  const entradas = consolidatedMonthTxs
    .filter((tx: any) => isRevenueTx(tx))
    .reduce((sum: number, tx: any) => sum + Math.abs(Number(tx.amount || 0)), 0);
  const saidas = consolidatedMonthTxs
    .filter((tx: any) => isExpenseTx(tx))
    .reduce((sum: number, tx: any) => sum - Math.abs(Number(tx.amount || 0)), 0);
  const saldoAnterior = previousBalance;
  const saldo = (includePreviousBalance ? saldoAnterior : 0) + entradas + saidas;

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
  if (selectedAccountIds.length) returnParams.set("account_ids", selectedAccountIds.join(","));
  else if (selectedAccountId) returnParams.set("account_id", selectedAccountId);
  if (selectedCategoryNames.length) returnParams.set("categories", selectedCategoryNames.join(","));
  returnParams.set("month_ref", selectedMonthRef);
  if (!includePreviousBalance) returnParams.set("include_previous_balance", "0");
  const returnUrl = `/dashboard?${returnParams.toString()}`;

  const dateInfo = formatCurrentDateInfo();

  return (
    <PageShell>
      <div className="fg-legacy-grid">
        <aside className="fg-legacy-side fg-legacy-side-stack">
          <div className="fg-legacy-side-block">
            <AccountsSidePanel
              accounts={accounts || []}
              bankById={bankById}
              accountBalanceById={accountBalanceById}
              selectedAccountIds={selectedAccountIds}
              selectedBankId={selectedBankId}
              currentTab={currentTab}
            />
          </div>

          {currentTab === "transactions" ? (
            <div className="fg-legacy-side-block">
              <div className="fg-legacy-side-title">Categorias</div>
              <CategoryTreePanel
                groups={categoryGroups}
                selectedCategories={selectedCategoryNames}
                selectedBankId={selectedBankId}
                selectedAccountIds={selectedAccountIds}
                selectedAccountId={selectedAccountId}
                categoriesCatalog={categoriesCatalog}
              />
            </div>
          ) : null}
        </aside>

        <section className="fg-stack">
          <LegacyToolbar
            selectedMonthRef={selectedMonthRef}
            dateInfo={dateInfo}
          />

          {currentTab === "transactions" ? (
            <>
              <TransactionsTable
                txs={txs || []}
                banks={banks || []}
                accounts={accounts || []}
                previousBalance={previousBalance}
                includePreviousBalance={includePreviousBalance}
                categoryOptions={categoryOptions}
                returnUrl={returnUrl}
                selectedEditTxId={selectedEditTxId}
              />
            </>
          ) : (
            <div className="fg-overview-grid">
              <div className="fg-stack">
                <Card title="Entradas e saídas">
                  <PreviousBalanceToggle checked={includePreviousBalance} label="Incluir saldo anterior" />
                  {includePreviousBalance ? <SummaryRow label="Saldo anterior" value={brl(saldoAnterior)} /> : null}
                  <SummaryRow label="Entradas" value={brl(entradas)} />
                  <SummaryRow label="Saídas" value={brl(saidas)} tone="negative" />
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
                <LegacyTxListCard title="Anteriores não consolidadas" rows={nonConsolidatedPast} />
                <LegacyTxListCard title="Próximas não consolidadas" rows={nonConsolidatedFuture} />
                <LegacyTxListCard title="Próximas com alerta" rows={alertFuture} />
              </div>
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}

function LegacyToolbar(input: {
  selectedMonthRef: string;
  dateInfo: { weekdayDate: string; accessText: string };
}) {
  return (
    <div className="fg-legacy-toolbar">
      <div className="fg-legacy-toolbar-left">
        <MonthRefPicker value={input.selectedMonthRef} />
      </div>

      <div className="fg-legacy-toolbar-right">
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
  accountBalanceById: Map<string, number>;
  selectedAccountIds: string[];
  selectedBankId: string;
  currentTab: "overview" | "transactions";
}) {
  const rows = input.accounts.map((account: any) => {
    const accountId = String(account.id || "");
    const computedBalance = input.accountBalanceById.get(accountId);
    const bank = input.bankById.get(String(account.bank_id || ""));
    return {
      id: accountId,
      name: String(account.name || ""),
      balance: Number.isFinite(Number(computedBalance)) ? Number(computedBalance) : Number(account.balance || 0),
      type: account.type || null,
      bankName: String(bank?.name || account.institution_name || "Sem banco"),
    };
  });

  return (
    <AccountsFilterPanel
      title="Contas"
      accounts={rows}
      selectedAccountIds={input.selectedAccountIds}
      selectedBankId={input.selectedBankId}
      currentTab={input.currentTab}
    />
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
        <input name="description" required placeholder="Descrição" className="fg-input" />
        <input name="posted_at" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required className="fg-input" />
      </div>

      <div className="fg-grid-3">
        <input name="amount" type="number" step="0.01" required placeholder="Valor" className="fg-input" />
        <select name="action" defaultValue="Despesa" required className="fg-select">
          <option value="Receita">Receita</option>
          <option value="Despesa">Despesa</option>
          <option value="Transferência">Transferência</option>
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
                <th>Transação</th>
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
        <div className="fg-empty">Nenhuma transação.</div>
      )}
    </Card>
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

function formatCurrentDateInfo() {
  const now = new Date();
  const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(now);
  const date = new Intl.DateTimeFormat("pt-BR").format(now);
  const time = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(now);

  const weekdayDate = `${capitalize(weekday)}, ${date}`;
  const accessText = `Último acesso: ${date} às ${time}`;

  return { weekdayDate, accessText };
}

function parseCsvList(input?: string) {
  if (!input) return [];

  return input
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function capitalize(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function buildCategoryCatalog(rows: Array<{ id: string; name: string; parent_id: string | null }>) {
  const idToName = new Map<string, string>();
  for (const row of rows || []) idToName.set(String(row.id), String(row.name || ""));

  return (rows || [])
    .map((row) => ({
      name: String(row.name || ""),
      parentName: row.parent_id ? idToName.get(String(row.parent_id)) || ROOT_CATEGORY_NAME : ROOT_CATEGORY_NAME,
    }))
    .filter((row) => row.name.length > 0);
}

function normalizeTxType(input?: string | null) {
  return String(input || "").trim().toLowerCase();
}

function isRevenueTx(tx: any) {
  const type = normalizeTxType(tx?.type);
  if (type === "credit") return true;
  if (type === "transfer") return false;
  return Number(tx?.amount || 0) > 0;
}

function isExpenseTx(tx: any) {
  const type = normalizeTxType(tx?.type);
  if (type === "debit") return true;
  if (type === "transfer") return false;
  return Number(tx?.amount || 0) < 0;
}

function buildCategorySelectOptions(input: {
  categoriesCatalog: Array<{ name: string; parentName: string }>;
  extraNames: string[];
}): CategorySelectOption[] {
  const parentByName = new Map<string, string>();

  for (const row of input.categoriesCatalog || []) {
    const name = String(row.name || "").trim();
    if (!name) continue;
    let parentName = String(row.parentName || ROOT_CATEGORY_NAME).trim() || ROOT_CATEGORY_NAME;
    if (name === ROOT_CATEGORY_NAME) parentName = ROOT_CATEGORY_NAME;
    if (name === parentName) parentName = ROOT_CATEGORY_NAME;
    parentByName.set(name, parentName);
  }

  if (!parentByName.has(ROOT_CATEGORY_NAME)) {
    parentByName.set(ROOT_CATEGORY_NAME, ROOT_CATEGORY_NAME);
  }

  for (const extra of input.extraNames || []) {
    const name = String(extra || "").trim();
    if (!name || name === ROOT_CATEGORY_NAME) continue;
    if (!parentByName.has(name)) parentByName.set(name, ROOT_CATEGORY_NAME);
  }

  const allNames = Array.from(parentByName.keys());
  for (const name of allNames) {
    if (name === ROOT_CATEGORY_NAME) continue;
    const parentName = parentByName.get(name) || ROOT_CATEGORY_NAME;
    if (!parentByName.has(parentName)) parentByName.set(parentName, ROOT_CATEGORY_NAME);
  }

  const childrenByParent = new Map<string, string[]>();
  function pushChild(parentName: string, childName: string) {
    const list = childrenByParent.get(parentName) || [];
    if (!list.includes(childName)) list.push(childName);
    childrenByParent.set(parentName, list);
  }

  for (const [name, parentNameRaw] of parentByName.entries()) {
    if (name === ROOT_CATEGORY_NAME) continue;
    const parentName = parentNameRaw && parentNameRaw !== name ? parentNameRaw : ROOT_CATEGORY_NAME;
    pushChild(parentName, name);
  }

  for (const [parentName, children] of childrenByParent.entries()) {
    childrenByParent.set(parentName, [...children].sort((a, b) => a.localeCompare(b, "pt-BR")));
  }

  const options: CategorySelectOption[] = [];
  const visited = new Set<string>();

  function walkNode(name: string, depth: number) {
    if (name === ROOT_CATEGORY_NAME) return;
    if (visited.has(name)) return;
    visited.add(name);

    const indent = depth > 0 ? `${"\u00A0\u00A0".repeat(depth)}↳ ` : "";
    options.push({ value: name, label: `${indent}${name}`, depth });

    const children = childrenByParent.get(name) || [];
    for (const child of children) walkNode(child, depth + 1);
  }

  const rootChildren = childrenByParent.get(ROOT_CATEGORY_NAME) || [];
  for (const child of rootChildren) walkNode(child, 0);

  const remaining = Array.from(parentByName.keys())
    .filter((name) => name !== ROOT_CATEGORY_NAME && !visited.has(name))
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
  for (const name of remaining) walkNode(name, 0);

  return options;
}






