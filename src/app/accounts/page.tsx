import Link from "next/link";
import { PageShell, Card, SectionIntro, Stat } from "@/components/ui";
import { AccountsQuickCreateDialogs } from "@/components/accounts-quick-create-dialogs";
import { requireServerSession } from "@/lib/auth-server";
import { createUserDb } from "@/lib/user-db";
import { brl } from "@/lib/format";
import { accountTypeLabel } from "@/lib/accounts";

export const dynamic = "force-dynamic";

type AccountsParams = {
  edit_bank?: string;
  delete_bank?: string;
  edit_account?: string;
  delete_account?: string;
  ok?: string;
  error?: string;
};

export default async function AccountsPage({ searchParams }: { searchParams: Promise<AccountsParams> }) {
  const { user, accessToken } = await requireServerSession();
  const supabaseAdmin = createUserDb(accessToken);
  const params = await searchParams;

  const [{ data: banks }, { data: accounts }, { data: txs }] = await Promise.all([
    supabaseAdmin
      .from("banks")
      .select("id, name, code, created_at")
      .eq("profile_id", user.id)
      .order("name"),
    supabaseAdmin
      .from("accounts")
      .select("id, bank_id, name, institution_name, type, balance, last_balance_at, created_at")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("transactions")
      .select("account_id, amount, is_consolidated")
      .eq("profile_id", user.id),
  ]);

  const bankById = new Map<string, any>((banks || []).map((bank: any) => [String(bank.id), bank]));

  const statsByAccount = new Map<string, { consolidatedExpense: number; plannedExpense: number; consolidatedIncome: number; txCount: number }>();
  for (const tx of (txs || []) as any[]) {
    const accountId = String(tx.account_id || "");
    if (!accountId) continue;

    const current = statsByAccount.get(accountId) || { consolidatedExpense: 0, plannedExpense: 0, consolidatedIncome: 0, txCount: 0 };
    const amount = Number(tx.amount || 0);
    const consolidated = tx.is_consolidated !== false;

    current.txCount += 1;
    if (consolidated && amount < 0) current.consolidatedExpense += Math.abs(amount);
    if (!consolidated && amount < 0) current.plannedExpense += Math.abs(amount);
    if (consolidated && amount > 0) current.consolidatedIncome += amount;
    statsByAccount.set(accountId, current);
  }

  const totals = {
    balance: (accounts || []).reduce((sum: number, account: any) => {
      const stats = statsByAccount.get(String(account.id)) || null;
      return sum + resolveAccountDisplayedBalance(account, stats);
    }, 0),
    consolidatedExpense: Array.from(statsByAccount.values()).reduce((sum, item) => sum + item.consolidatedExpense, 0),
    plannedExpense: Array.from(statsByAccount.values()).reduce((sum, item) => sum + item.plannedExpense, 0),
    consolidatedIncome: Array.from(statsByAccount.values()).reduce((sum, item) => sum + item.consolidatedIncome, 0),
  };

  const selectedEditBankId = String(params.edit_bank || "").trim();
  const selectedDeleteBankId = String(params.delete_bank || "").trim();
  const selectedEditAccountId = String(params.edit_account || "").trim();
  const selectedDeleteAccountId = String(params.delete_account || "").trim();

  const editingBank = (banks || []).find((bank: any) => String(bank.id) === selectedEditBankId) || null;
  const deletingBank = (banks || []).find((bank: any) => String(bank.id) === selectedDeleteBankId) || null;
  const editingAccount = (accounts || []).find((account: any) => String(account.id) === selectedEditAccountId) || null;
  const deletingAccount = (accounts || []).find((account: any) => String(account.id) === selectedDeleteAccountId) || null;
  const editingAccountTypeLabel = accountTypeLabel(editingAccount?.type);
  const status = buildStatusMessage(params.ok, params.error);

  const bankRows = (banks || []).map((bank: any) => {
    const accountsFromBank = (accounts || []).filter((account: any) => String(account.bank_id || "") === String(bank.id));
    const accountIds = new Set(accountsFromBank.map((account: any) => String(account.id)));

    const bankBalance = accountsFromBank.reduce((sum: number, account: any) => {
      const stats = statsByAccount.get(String(account.id)) || null;
      return sum + resolveAccountDisplayedBalance(account, stats);
    }, 0);
    let bankConsolidatedExpense = 0;
    let bankPlannedExpense = 0;

    for (const [accountId, stats] of statsByAccount.entries()) {
      if (!accountIds.has(accountId)) continue;
      bankConsolidatedExpense += stats.consolidatedExpense;
      bankPlannedExpense += stats.plannedExpense;
    }

    return {
      id: String(bank.id),
      name: String(bank.name || ""),
      code: String(bank.code || ""),
      accountCount: accountsFromBank.length,
      balance: bankBalance,
      consolidatedExpense: bankConsolidatedExpense,
      plannedExpense: bankPlannedExpense,
    };
  });

  const accountRows = (accounts || []).map((account: any) => {
    const stats = statsByAccount.get(String(account.id)) || {
      consolidatedExpense: 0,
      plannedExpense: 0,
      consolidatedIncome: 0,
      txCount: 0,
    };

    const bank = bankById.get(String(account.bank_id || ""));
    const bankName = bank?.name || account.institution_name || "-";
    const typeLabel = accountTypeLabel(account.type);

    return {
      id: String(account.id),
      bankName,
      name: account.name || "-",
      typeLabel,
      balance: resolveAccountDisplayedBalance(account, stats),
      txCount: stats.txCount,
      consolidatedExpense: stats.consolidatedExpense,
      plannedExpense: stats.plannedExpense,
      consolidatedIncome: stats.consolidatedIncome,
    };
  });

  return (
    <PageShell>
      <div className="fg-stack fg-accounts-page">
        <SectionIntro
          title="Bancos & Contas"
          subtitle="Estruture seus bancos e contas em um fluxo simples e profissional. Cadastre, edite e acompanhe o panorama financeiro em tempo real."
        />

        {status ? <div className={`fg-accounts-status ${status.tone === "error" ? "is-error" : "is-ok"}`}>{status.text}</div> : null}

        <div className="fg-accounts-kpi-grid">
          <Stat label="Bancos cadastrados" value={String((banks || []).length)} />
          <Stat label="Contas cadastradas" value={String((accounts || []).length)} />
          <Stat label="Saldo total" value={brl(totals.balance)} tone={totals.balance >= 0 ? "positive" : "negative"} />
          <Stat label="Receitas consolidadas" value={brl(totals.consolidatedIncome)} tone="positive" />
          <Stat label="Despesas consolidadas" value={brl(-totals.consolidatedExpense)} tone="negative" />
          <Stat label="Despesas planejadas" value={brl(-totals.plannedExpense)} tone="negative" />
        </div>

        <Card
          title="Atalhos de cadastro"
          action={<span className="fg-chip">Fluxo rapido</span>}
        >
          <AccountsQuickCreateDialogs
            banks={(banks || []).map((bank: any) => ({
              id: String(bank.id),
              name: String(bank.name || ""),
              code: bank.code ? String(bank.code) : "",
            }))}
          />
          <p className="fg-field-note">Use os atalhos para ir direto ao formulario desejado.</p>
        </Card>

        {editingBank ? (
          <Card title={`Editar banco: ${editingBank.name}`}>
            <form action="/api/banks/save" method="post" className="fg-form">
              <input type="hidden" name="id" value={editingBank.id} />
              <div className="fg-grid-2">
                <input name="bank_name" required defaultValue={editingBank.name || ""} placeholder="Nome do banco" className="fg-input" />
                <input name="bank_code" defaultValue={editingBank.code || ""} placeholder="Codigo do banco (opcional)" className="fg-input" />
              </div>
              <div className="fg-account-actions">
                <button className="fg-btn">Salvar alteracoes</button>
                <Link href="/accounts" className="fg-btn-secondary">Cancelar</Link>
              </div>
            </form>
          </Card>
        ) : null}

        {editingAccount ? (
          <Card title={`Editar conta: ${editingAccount.name || "Sem nome"}`}>
            <form action="/api/accounts/save" method="post" className="fg-form">
              <input type="hidden" name="id" value={editingAccount.id} />
              <div className="fg-grid-3">
                <select name="bank_id" required className="fg-select" defaultValue={String(editingAccount.bank_id || "")}>
                  {(banks || []).map((bank: any) => (
                    <option key={bank.id} value={bank.id}>
                      {bank.name} {bank.code ? `(${bank.code})` : ""}
                    </option>
                  ))}
                </select>
                <input name="account_name" required defaultValue={editingAccount.name || ""} placeholder="Nome da conta" className="fg-input" />
                <select name="account_type" className="fg-select" defaultValue={editingAccountTypeLabel}>
                  <option value="CONTA_CORRENTE">CONTA_CORRENTE</option>
                  <option value="CARTAO_DE_CREDITO">CARTAO_DE_CREDITO</option>
                </select>
              </div>
              <input
                name="balance"
                type="number"
                step="0.01"
                defaultValue={Number(editingAccount.balance || 0).toFixed(2)}
                className="fg-input"
              />
              <div className="fg-account-actions">
                <button className="fg-btn">Salvar alteracoes</button>
                <Link href="/accounts" className="fg-btn-secondary">Cancelar</Link>
              </div>
            </form>
          </Card>
        ) : null}

        {deletingAccount ? (
          <Card title={`Excluir conta: ${deletingAccount.name || "Sem nome"}`}>
            <div className="fg-stack">
              <p>
                Esta ação exclui a conta selecionada e as transações vinculadas. Esta operação não pode ser desfeita.
              </p>
              <form action="/api/accounts/delete" method="post" className="fg-form">
                <input type="hidden" name="id" value={deletingAccount.id} />
                <div className="fg-account-actions">
                  <button className="fg-btn-danger">Confirmar exclusão</button>
                  <Link href="/accounts" className="fg-btn-secondary">Cancelar</Link>
                </div>
              </form>
            </div>
          </Card>
        ) : null}

        {deletingBank ? (
          <Card title={`Excluir banco: ${deletingBank.name || "Sem nome"}`}>
            <div className="fg-stack">
              <p>
                Esta ação exclui apenas o banco selecionado. Caso existam contas vinculadas, exclua ou mova as contas antes de confirmar.
              </p>
              <form action="/api/banks/delete" method="post" className="fg-form">
                <input type="hidden" name="id" value={deletingBank.id} />
                <div className="fg-account-actions">
                  <button className="fg-btn-danger">Confirmar exclusão</button>
                  <Link href="/accounts" className="fg-btn-secondary">Cancelar</Link>
                </div>
              </form>
            </div>
          </Card>
        ) : null}

        <div className="fg-accounts-table-grid">
          <Card title="Visão por banco">
            <div className="fg-table-wrap">
              <table className="fg-table fg-accounts-table">
                <thead>
                  <tr>
                    <th>Banco</th>
                    <th>Código</th>
                    <th>Contas</th>
                    <th>Saldo</th>
                    <th>Despesa consolidada</th>
                    <th>Despesa prevista</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {bankRows.map((row) => {
                    const isEditing = selectedEditBankId === row.id;
                    return (
                      <tr key={row.id} className={isEditing ? "is-row-active" : ""}>
                        <td>{row.name}</td>
                        <td>{row.code || "-"}</td>
                        <td>{row.accountCount}</td>
                        <td>{brl(row.balance)}</td>
                        <td>{brl(-row.consolidatedExpense)}</td>
                        <td>{brl(-row.plannedExpense)}</td>
                        <td>
                          <Link href={editLink("edit_bank", row.id)} className="fg-link fg-accounts-inline-action">Editar</Link>
                          {" "}
                          <Link href={editLink("delete_bank", row.id)} className="fg-link fg-accounts-inline-action">Excluir</Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Visão por conta">
            <div className="fg-table-wrap">
              <table className="fg-table fg-accounts-table">
                <thead>
                  <tr>
                    <th>Banco</th>
                    <th>Conta</th>
                    <th>Tipo</th>
                    <th>Saldo</th>
                    <th>Transações</th>
                    <th>Despesa consolidada</th>
                    <th>Despesa prevista</th>
                    <th>Receita consolidada</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {accountRows.map((row) => {
                    const isEditing = selectedEditAccountId === row.id;
                    return (
                      <tr key={row.id} className={isEditing ? "is-row-active" : ""}>
                        <td>{row.bankName}</td>
                        <td>{row.name}</td>
                        <td>
                          <span className={`fg-chip ${row.typeLabel === "CARTAO_DE_CREDITO" ? "fg-chip-negative" : "fg-chip-positive"}`}>
                            {row.typeLabel}
                          </span>
                        </td>
                        <td>{brl(row.balance)}</td>
                        <td>{row.txCount}</td>
                        <td>{brl(-row.consolidatedExpense)}</td>
                        <td>{brl(-row.plannedExpense)}</td>
                        <td>{brl(row.consolidatedIncome)}</td>
                        <td>
                          <Link href={editLink("edit_account", row.id)} className="fg-link fg-accounts-inline-action">Editar</Link>
                          {" "}
                          <Link href={editLink("delete_account", row.id)} className="fg-link fg-accounts-inline-action">Excluir</Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

function editLink(param: "edit_bank" | "delete_bank" | "edit_account" | "delete_account", value: string) {
  return `/accounts?${param}=${encodeURIComponent(value)}`;
}

function buildStatusMessage(okValue?: string, errorValue?: string) {
  const okMap: Record<string, string> = {
    "1": "Conta salva com sucesso.",
    bank_saved: "Banco salvo com sucesso.",
    bank_updated: "Banco atualizado com sucesso.",
    bank_deleted: "Banco excluido com sucesso.",
    account_deleted: "Conta excluida com sucesso.",
  };

  const errorMap: Record<string, string> = {
    missing_fields: "Preencha os campos obrigatorios da conta.",
    missing_bank_name: "Informe o nome do banco.",
    invalid_bank: "Banco invalido para esta conta.",
    bank_not_found: "Banco nao encontrado para edicao.",
    missing_bank: "Banco invalido para exclusao.",
    bank_delete_not_found: "Banco nao encontrado para exclusao.",
    bank_has_accounts: "Nao foi possivel excluir: existem contas vinculadas a este banco.",
    bank_delete_failed: "Nao foi possivel excluir o banco agora.",
    missing_account: "Conta invalida para exclusao.",
    account_not_found: "Conta nao encontrada para exclusao.",
    delete_failed: "Nao foi possivel excluir a conta agora.",
  };

  if (errorValue && errorMap[errorValue]) return { tone: "error" as const, text: errorMap[errorValue] };
  if (okValue && okMap[okValue]) return { tone: "ok" as const, text: okMap[okValue] };
  return null;
}

function resolveAccountDisplayedBalance(
  account: any,
  stats: { consolidatedExpense: number; consolidatedIncome: number } | null | undefined
) {
  const consolidatedAmount = (stats?.consolidatedIncome || 0) - (stats?.consolidatedExpense || 0);
  const rawBalance = Number(account?.balance || 0);
  const hasSnapshotBalance = Boolean(account?.last_balance_at);

  if (hasSnapshotBalance && Number.isFinite(rawBalance)) {
    return rawBalance;
  }

  if (Number.isFinite(rawBalance) && rawBalance !== 0) {
    return rawBalance + consolidatedAmount;
  }

  return consolidatedAmount;
}
