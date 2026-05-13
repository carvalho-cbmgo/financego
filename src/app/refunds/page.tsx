import { PageShell, Card } from "@/components/ui";
import { requireServerSession } from "@/lib/auth-server";
import { createUserDb } from "@/lib/user-db";
import { brl, shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function RefundsPage() {
  const { user, accessToken } = await requireServerSession();
  const supabaseAdmin = createUserDb(accessToken);
  const { data: refunds } = await supabaseAdmin
    .from("transactions")
    .select("id, description, merchant, amount, posted_at, refund_status, refund_match_key, refund_of_transaction_id")
    .eq("profile_id", user.id)
    .eq("is_refund", true)
    .order("posted_at", { ascending: false })
    .limit(100);

  const { data: refundedPurchases } = await supabaseAdmin
    .from("transactions")
    .select("id, description, merchant, amount, posted_at, refund_status")
    .eq("profile_id", user.id)
    .in("refund_status", ["refunded", "partial_refund"])
    .order("posted_at", { ascending: false })
    .limit(100);

  return (
    <PageShell>
      <div style={{ display: "grid", gap: 16 }}>
        <h1 style={{ margin: 0 }}>Estornos</h1>

        <Card title="Créditos de estorno detectados">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <Th>Data</Th>
                <Th>Descrição</Th>
                <Th>Estabelecimento</Th>
                <Th>Valor</Th>
                <Th>Vinculado?</Th>
              </tr>
            </thead>
            <tbody>
              {(refunds || []).map((tx: any) => (
                <tr key={tx.id}>
                  <Td>{shortDate(tx.posted_at)}</Td>
                  <Td>{tx.description}</Td>
                  <Td>{tx.merchant || "-"}</Td>
                  <Td>{brl(tx.amount)}</Td>
                  <Td>{tx.refund_of_transaction_id ? "Sim" : "Não"}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Compras marcadas como estornadas">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <Th>Data</Th>
                <Th>Descrição</Th>
                <Th>Valor</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {(refundedPurchases || []).map((tx: any) => (
                <tr key={tx.id}>
                  <Td>{shortDate(tx.posted_at)}</Td>
                  <Td>{tx.description}</Td>
                  <Td>{brl(tx.amount)}</Td>
                  <Td>{tx.refund_status}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </PageShell>
  );
}

function Th({ children }: any) {
  return <th style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid #ddd" }}>{children}</th>;
}

function Td({ children }: any) {
  return <td style={{ padding: "10px 8px", borderBottom: "1px solid #eee" }}>{children}</td>;
}
