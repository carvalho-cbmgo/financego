import { PageShell, Card, SectionIntro, Stat } from "@/components/ui";
import { requireServerSession } from "@/lib/auth-server";
import { createUserDb } from "@/lib/user-db";
import { brl } from "@/lib/format";
import { accountTypeLabel } from "@/lib/accounts";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const { user, accessToken } = await requireServerSession();
  const supabaseAdmin = createUserDb(accessToken);

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

  return (
    <PageShell>
      <div className="fg-stack">
        <SectionIntro
          title="Bancos e contas"
          subtitle="Cadastre primeiro o banco e depois as contas vinculadas. Isso habilita analise por instituicao e por conta."
        />

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
                <select name="bank_id" required className="fg-select" defaultValue={String(banks?.[0]?.id || "") }>
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

                  return (
                    <tr key={bank.id}>
                      <td>{bank.name}</td>
                      <td>{bank.code || "-"}</td>
                      <td>{accountsFromBank.length}</td>
                      <td>{brl(bankBalance)}</td>
                      <td>{brl(bankConsolidatedExpense)}</td>
                      <td>{brl(bankPlannedExpense)}</td>
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

                  return (
                    <tr key={account.id}>
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

