import { PageShell, Card, SectionIntro, Stat } from "@/components/ui";
import { requireServerSession } from "@/lib/auth-server";
import { createUserDb } from "@/lib/user-db";
import { brl, shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function RefundsPage() {
  const { user, accessToken } = await requireServerSession();
  const supabaseAdmin = createUserDb(accessToken);

  const [{ data: refunds }, { data: refundedPurchases }] = await Promise.all([
    supabaseAdmin
      .from("transactions")
      .select("id, description, merchant, amount, posted_at, refund_status, refund_match_key, refund_of_transaction_id")
      .eq("profile_id", user.id)
      .eq("is_refund", true)
      .order("posted_at", { ascending: false })
      .limit(100),
    supabaseAdmin
      .from("transactions")
      .select("id, description, merchant, amount, posted_at, refund_status")
      .eq("profile_id", user.id)
      .in("refund_status", ["refunded", "partial_refund"])
      .order("posted_at", { ascending: false })
      .limit(100),
  ]);

  return (
    <PageShell>
      <div className="fg-stack">
        <SectionIntro
          title="Estornos"
          subtitle="Monitore creditos de estorno e compras marcadas como estornadas."
        />

        <div className="fg-grid-4">
          <Stat label="Creditos de estorno" value={String((refunds || []).length)} />
          <Stat label="Compras estornadas" value={String((refundedPurchases || []).length)} />
          <Stat
            label="Valor total de estornos"
            value={brl((refunds || []).reduce((sum: number, tx: any) => sum + Math.abs(Number(tx.amount || 0)), 0))}
            tone="positive"
          />
          <Stat
            label="Valor de compras estornadas"
            value={brl((refundedPurchases || []).reduce((sum: number, tx: any) => sum + Math.abs(Number(tx.amount || 0)), 0))}
          />
        </div>

        <Card title="Creditos de estorno detectados">
          <div className="fg-table-wrap">
            <table className="fg-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descricao</th>
                  <th>Estabelecimento</th>
                  <th>Valor</th>
                  <th>Vinculado</th>
                </tr>
              </thead>
              <tbody>
                {(refunds || []).map((tx: any) => (
                  <tr key={tx.id}>
                    <td>{shortDate(tx.posted_at)}</td>
                    <td>{tx.description}</td>
                    <td>{tx.merchant || "-"}</td>
                    <td>{brl(tx.amount)}</td>
                    <td>{tx.refund_of_transaction_id ? "Sim" : "Nao"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Compras marcadas como estornadas">
          <div className="fg-table-wrap">
            <table className="fg-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descricao</th>
                  <th>Valor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(refundedPurchases || []).map((tx: any) => (
                  <tr key={tx.id}>
                    <td>{shortDate(tx.posted_at)}</td>
                    <td>{tx.description}</td>
                    <td>{brl(tx.amount)}</td>
                    <td>{tx.refund_status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}

