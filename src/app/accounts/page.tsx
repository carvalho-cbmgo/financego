import { PageShell, Card } from "@/components/ui";
import { requireServerSession } from "@/lib/auth-server";
import { createUserDb } from "@/lib/user-db";
import { brl } from "@/lib/format";
import { accountTypeLabel } from "@/lib/accounts";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const { user, accessToken } = await requireServerSession();
  const supabaseAdmin = createUserDb(accessToken);

  const { data: accounts } = await supabaseAdmin
    .from("accounts")
    .select("id, name, institution_name, type, balance, created_at")
    .eq("profile_id", user.id)
    .order("institution_name")
    .order("created_at", { ascending: false });

  const { data: txs } = await supabaseAdmin
    .from("transactions")
    .select("account_id, amount, is_consolidated")
    .eq("profile_id", user.id);

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
      <div style={{ display: "grid", gap: 16, maxWidth: 1200 }}>
        <h1 style={{ margin: 0 }}>Contas por banco</h1>

        <Card title="Cadastrar conta">
          <form action="/api/accounts/save" method="post" style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <input name="bank_name" required placeholder="Banco (ex: NUBANK, BTG, PORTO SEGURO)" style={input} />
              <input name="account_name" required placeholder="Nome da conta (ex: Cartao principal)" style={input} />
              <select name="account_type" style={input} defaultValue="CONTA_CORRENTE">
                <option value="CONTA_CORRENTE">CONTA_CORRENTE</option>
                <option value="CARTAO_DE_CREDITO">CARTAO_DE_CREDITO</option>
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 10 }}>
              <input name="balance" type="number" step="0.01" placeholder="Saldo inicial (opcional)" style={input} />
              <div style={{ color: "#6b7280", alignSelf: "center" }}>
                Cada transacao podera ser vinculada a uma dessas contas para analise por banco/conta.
              </div>
            </div>
            <button style={button}>Salvar conta</button>
          </form>
        </Card>

        <Card title="Contas cadastradas e visao financeira">
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

                return (
                  <tr key={account.id}>
                    <Td>{account.institution_name || "-"}</Td>
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
