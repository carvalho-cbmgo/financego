import { PageShell, Card } from "@/components/ui";
import { requireServerSession } from "@/lib/auth-server";
import { createUserDb } from "@/lib/user-db";
import { brl } from "@/lib/format";
import { accountTypeLabel } from "@/lib/accounts";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const { user, accessToken } = await requireServerSession();
  const supabaseAdmin = createUserDb(accessToken);

  const { data: banks } = await supabaseAdmin
    .from("banks")
    .select("id, name, code, created_at")
    .eq("profile_id", user.id)
    .order("name");

  const { data: accounts } = await supabaseAdmin
    .from("accounts")
    .select("id, bank_id, name, institution_name, type, balance, created_at")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  const { data: txs } = await supabaseAdmin
    .from("transactions")
    .select("account_id, amount, is_consolidated")
    .eq("profile_id", user.id);

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

  return (
    <PageShell>
      <div style={{ display: "grid", gap: 16, maxWidth: 1240 }}>
        <h1 style={{ margin: 0 }}>Bancos e contas</h1>

        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1.4fr" }}>
          <Card title="1) Cadastrar banco">
            <form action="/api/banks/save" method="post" style={{ display: "grid", gap: 10 }}>
              <input name="bank_name" required placeholder="Nome do banco (ex: NUBANK, BTG, CAIXA)" style={input} />
              <input name="bank_code" placeholder="Codigo opcional (ex: 260, 208, 104)" style={input} />
              <button style={button}>Salvar banco</button>
            </form>
            <p style={{ color: "#6b7280", marginBottom: 0 }}>
              Cadastre primeiro os bancos. Depois, vincule cada conta a um banco.
            </p>
          </Card>

          <Card title="2) Cadastrar conta vinculada a banco">
            <form action="/api/accounts/save" method="post" style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <select name="bank_id" required style={input} defaultValue={String(banks?.[0]?.id || "")}>
                  {!banks?.length ? <option value="">Cadastre um banco antes</option> : null}
                  {(banks || []).map((bank: any) => (
                    <option key={bank.id} value={bank.id}>
                      {bank.name} {bank.code ? `(${bank.code})` : ""}
                    </option>
                  ))}
                </select>
                <input name="account_name" required placeholder="Nome da conta (ex: Conta principal)" style={input} />
                <select name="account_type" style={input} defaultValue="CONTA_CORRENTE">
                  <option value="CONTA_CORRENTE">CONTA_CORRENTE</option>
                  <option value="CARTAO_DE_CREDITO">CARTAO_DE_CREDITO</option>
                </select>
              </div>
              <input name="balance" type="number" step="0.01" placeholder="Saldo inicial (opcional)" style={input} />
              <button style={button} disabled={!banks?.length}>Salvar conta</button>
            </form>
          </Card>
        </div>

        <Card title="Bancos cadastrados">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <Th>Banco</Th>
                <Th>Codigo</Th>
                <Th>Contas vinculadas</Th>
              </tr>
            </thead>
            <tbody>
              {(banks || []).map((bank: any) => {
                const totalAccounts = (accounts || []).filter((account: any) => String(account.bank_id || "") === String(bank.id)).length;
                return (
                  <tr key={bank.id}>
                    <Td>{bank.name}</Td>
                    <Td>{bank.code || "-"}</Td>
                    <Td>{totalAccounts}</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        <Card title="Contas cadastradas e visao financeira por conta">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <Th>Banco</Th>
                <Th>Conta</Th>
                <Th>Tipo</Th>
                <Th>Saldo</Th>
                <Th>Transacoes</Th>
                <Th>Despesa consolidada</Th>
                <Th>Despesa prevista</Th>
                <Th>Receita consolidada</Th>
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

                return (
                  <tr key={account.id}>
                    <Td>{bankName}</Td>
                    <Td>{account.name || "-"}</Td>
                    <Td>{accountTypeLabel(account.type)}</Td>
                    <Td>{brl(account.balance || 0)}</Td>
                    <Td>{stats.txCount}</Td>
                    <Td>{brl(stats.consolidatedExpense)}</Td>
                    <Td>{brl(stats.plannedExpense)}</Td>
                    <Td>{brl(stats.consolidatedIncome)}</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>
    </PageShell>
  );
}

const input = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "12px 10px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
};

const button = {
  padding: "12px 16px",
  borderRadius: 12,
  border: "none",
  background: "#111827",
  color: "#fff",
  fontWeight: 700,
};

function Th({ children }: any) {
  return <th style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid #ddd" }}>{children}</th>;
}

function Td({ children }: any) {
  return <td style={{ padding: "10px 8px", borderBottom: "1px solid #eee" }}>{children}</td>;
}
