import Link from "next/link";
import { PageShell, Card, SectionIntro, Stat } from "@/components/ui";
import { requireServerSession } from "@/lib/auth-server";
import { createUserDb } from "@/lib/user-db";
import { brl } from "@/lib/format";
import { accountTypeLabel } from "@/lib/accounts";

export const dynamic = "force-dynamic";

type AccountsParams = {
  edit_bank?: string;
  edit_account?: string;
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
      .select("id, bank_id, name, institution_name, type, balance, created_at")
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
    balance: (accounts || []).reduce((sum: number, account: any) => sum + Number(account.balance || 0), 0),
    consolidatedExpense: Array.from(statsByAccount.values()).reduce((sum, item) => sum + item.consolidatedExpense, 0),
    plannedExpense: Array.from(statsByAccount.values()).reduce((sum, item) => sum + item.plannedExpense, 0),
    consolidatedIncome: Array.from(statsByAccount.values()).reduce((sum, item) => sum + item.consolidatedIncome, 0),
  };

  const selectedEditBankId = String(params.edit_bank || "").trim();
  const selectedEditAccountId = String(params.edit_account || "").trim();

  const editingBank = (banks || []).find((bank: any) => String(bank.id) === selectedEditBankId) || null;
  const editingAccount = (accounts || []).find((account: any) => String(account.id) === selectedEditAccountId) || null;
  const editingAccountTypeLabel = accountTypeLabel(editingAccount?.type);

  const status = buildStatusMessage(params.ok, params.error);

  return (
    <PageShell>
      <div className="fg-stack">
        <SectionIntro
          title="Bancos & Contas"
          subtitle="Cadastre primeiro o banco e depois as contas vinculadas. Edite cada registro de forma individual para manter os dados organizados."
        />

        {status ? (
          <div
            className="fg-empty"
            style={
              status.tone === "error"
                ? { borderColor: "#cfb0b0", background: "#fff3f3", color: "#7c1d1d" }
                : { borderColor: "#b8cca0", background: "#f4faec", color: "#345f27" }
            }
          >
            {status.text}
          </div>
        ) : null}

        <div className="fg-grid-4">
          <Stat label="Bancos cadastrados" value={String((banks || []).length)} />
          <Stat label="Contas cadastradas" value={String((accounts || []).length)} />
          <Stat label="Saldo total" value={brl(totals.balance)} tone={totals.balance >= 0 ? "positive" : "negative"} />
          <Stat label="Receitas consolidadas" value={brl(totals.consolidatedIncome)} tone="positive" />
        </div>

        <div className="fg-split">
          <Card title="1) Cadastrar banco">
            <form action="/api/banks/save" method="post" className="fg-form">
              <input name="bank_name" required placeholder="Nome do banco (ex: NUBANK, BTG, CAIXA)" className="fg-input" />
              <input name="bank_code" placeholder="Codigo opcional (ex: 260, 208, 104)" className="fg-input" />
              <button className="fg-btn">Salvar banco</button>
            </form>
            <p className="fg-field-note">Dica: use o nome oficial para facilitar filtros e comparativos.</p>
          </Card>

          <Card title="2) Cadastrar conta vinculada">
            <form action="/api/accounts/save" method="post" className="fg-form">
              <div className="fg-grid-3">
                <select name="bank_id" required className="fg-select" defaultValue={String(banks?.[0]?.id || "")}>
                  {!banks?.length ? <option value="">Cadastre um banco antes</option> : null}
                  {(banks || []).map((bank: any) => (
                    <option key={bank.id} value={bank.id}>
                      {bank.name} {bank.code ? `(${bank.code})` : ""}
                    </option>
                  ))}
                </select>
                <input name="account_name" required placeholder="Nome da conta (ex: Conta principal)" className="fg-input" />
                <select name="account_type" className="fg-select" defaultValue="CONTA_CORRENTE">
                  <option value="CONTA_CORRENTE">CONTA_CORRENTE</option>
                  <option value="CARTAO_DE_CREDITO">CARTAO_DE_CREDITO</option>
                </select>
              </div>
              <input name="balance" type="number" step="0.01" placeholder="Saldo inicial (opcional)" className="fg-input" />
              <button className="fg-btn" disabled={!banks?.length}>Salvar conta</button>
            </form>
            <p className="fg-field-note">Cada transacao do sistema fica vinculada a uma dessas contas.</p>
          </Card>
        </div>

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

        <Card title="Visao por banco">
          <div className="fg-table-wrap">
            <table className="fg-table">
              <thead>
                <tr>
                  <th>Banco</th>
                  <th>Codigo</th>
                  <th>Contas</th>
                  <th>Saldo das contas</th>
                  <th>Despesas consolidadas</th>
                  <th>Despesas previstas</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {(banks || []).map((bank: any) => {
                  const accountsFromBank = (accounts || []).filter((account: any) => String(account.bank_id || "") === String(bank.id));
                  const accountIds = new Set(accountsFromBank.map((account: any) => String(account.id)));

                  const bankBalance = accountsFromBank.reduce((sum: number, account: any) => sum + Number(account.balance || 0), 0);

                  let bankConsolidatedExpense = 0;
                  let bankPlannedExpense = 0;

                  for (const [accountId, stats] of statsByAccount.entries()) {
                    if (!accountIds.has(accountId)) continue;
                    bankConsolidatedExpense += stats.consolidatedExpense;
                    bankPlannedExpense += stats.plannedExpense;
                  }

                  const isEditing = selectedEditBankId === String(bank.id);

                  return (
                    <tr key={bank.id} style={isEditing ? { background: "#f3f8df" } : undefined}>
                      <td>{bank.name}</td>
                      <td>{bank.code || "-"}</td>
                      <td>{accountsFromBank.length}</td>
                      <td>{brl(bankBalance)}</td>
                      <td>{brl(bankConsolidatedExpense)}</td>
                      <td>{brl(bankPlannedExpense)}</td>
                      <td>
                        <Link href={editLink("edit_bank", String(bank.id))} className="fg-link">Editar</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Visao por conta">
          <div className="fg-table-wrap">
            <table className="fg-table">
              <thead>
                <tr>
                  <th>Banco</th>
                  <th>Conta</th>
                  <th>Tipo</th>
                  <th>Saldo</th>
                  <th>Transacoes</th>
                  <th>Despesa consolidada</th>
                  <th>Despesa prevista</th>
                  <th>Receita consolidada</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {(accounts || []).map((account: any) => {
                  const stats = statsByAccount.get(String(account.id)) || {
                    consolidatedExpense: 0,
                    plannedExpense: 0,
                    consolidatedIncome: 0,
                    txCount: 0,
                  };

                  const bank = bankById.get(String(account.bank_id || ""));
                  const bankName = bank?.name || account.institution_name || "-";
                  const typeLabel = accountTypeLabel(account.type);
                  const isEditing = selectedEditAccountId === String(account.id);

                  return (
                    <tr key={account.id} style={isEditing ? { background: "#f3f8df" } : undefined}>
                      <td>{bankName}</td>
                      <td>{account.name || "-"}</td>
                      <td>
                        <span className={`fg-chip ${typeLabel === "CARTAO_DE_CREDITO" ? "fg-chip-negative" : "fg-chip-positive"}`}>
                          {typeLabel}
                        </span>
                      </td>
                      <td>{brl(account.balance || 0)}</td>
                      <td>{stats.txCount}</td>
                      <td>{brl(stats.consolidatedExpense)}</td>
                      <td>{brl(stats.plannedExpense)}</td>
                      <td>{brl(stats.consolidatedIncome)}</td>
                      <td>
                        <Link href={editLink("edit_account", String(account.id))} className="fg-link">Editar</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}

function editLink(param: "edit_bank" | "edit_account", value: string) {
  return `/accounts?${param}=${encodeURIComponent(value)}`;
}

function buildStatusMessage(okValue?: string, errorValue?: string) {
  const okMap: Record<string, string> = {
    "1": "Conta salva com sucesso.",
    bank_saved: "Banco salvo com sucesso.",
    bank_updated: "Banco atualizado com sucesso.",
  };

  const errorMap: Record<string, string> = {
    missing_fields: "Preencha todos os campos obrigatorios da conta.",
    missing_bank_name: "Informe o nome do banco.",
    invalid_bank: "Banco invalido para esta conta.",
    bank_not_found: "Banco nao encontrado para edicao.",
  };

  if (errorValue && errorMap[errorValue]) return { tone: "error" as const, text: errorMap[errorValue] };
  if (okValue && okMap[okValue]) return { tone: "ok" as const, text: okMap[okValue] };
  return null;
}
