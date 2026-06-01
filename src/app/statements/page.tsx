import Link from "next/link";
import { PageShell, Card, SectionIntro, Stat } from "@/components/ui";
import { requireServerSession } from "@/lib/auth-server";
import { createUserDb } from "@/lib/user-db";
import { shortDate } from "@/lib/format";
import { accountTypeLabel } from "@/lib/accounts";

export const dynamic = "force-dynamic";

export default async function StatementsPage() {
  const { user, accessToken } = await requireServerSession();
  const supabaseAdmin = createUserDb(accessToken);

  const [{ data: banks }, { data: accounts }, { data: imports }] = await Promise.all([
    supabaseAdmin
      .from("banks")
      .select("id, name, code")
      .eq("profile_id", user.id)
      .order("name"),
    supabaseAdmin
      .from("accounts")
      .select("id, bank_id, name, institution_name, type")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("statement_imports")
      .select("id, bank_key, account_id, source_type, file_name, status, total_detected, total_imported, total_duplicates, created_at")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const bankById = new Map<string, any>((banks || []).map((bank: any) => [String(bank.id), bank]));
  const accountById = new Map<string, any>((accounts || []).map((acc: any) => [String(acc.id), acc]));

  return (
    <PageShell>
      <div className="fg-stack" style={{ maxWidth: 1200 }}>
        <SectionIntro
          title="Extrato e importação"
          subtitle="Importe PDF, CSV ou texto de fatura/extrato, sempre vinculando cada item a uma conta específica."
          action={<Link href="/accounts" className="fg-link">Gerenciar contas</Link>}
        />

        <div className="fg-grid-4">
          <Stat label="Bancos cadastrados" value={String((banks || []).length)} />
          <Stat label="Contas disponíveis" value={String((accounts || []).length)} />
          <Stat label="Importações listadas" value={String((imports || []).length)} />
          <Stat
            label="Última importação"
            value={imports?.[0]?.created_at ? shortDate(imports[0].created_at) : "-"}
          />
        </div>

        {!accounts?.length ? (
          <Card title="Sem contas cadastradas">
            <div className="fg-empty">
              Para importar transações, primeiro cadastre bancos e contas.
              <div style={{ marginTop: 10 }}>
                <Link href="/accounts" className="fg-link">Ir para bancos e contas</Link>
              </div>
            </div>
          </Card>
        ) : null}

        <Card title="Importação estruturada" action={<span className="fg-chip">PDF, CSV, TXT e OFX</span>}>
          <form action="/api/statements/import" method="post" encType="multipart/form-data" className="fg-form">
            <div className="fg-grid-2">
              <div className="fg-form">
                <label>Conta de destino</label>
                <select name="account_id" required className="fg-select">
                  {(accounts || []).map((account: any) => {
                    const bank = bankById.get(String(account.bank_id || ""));
                    const bankName = bank?.name || account.institution_name || "Sem banco";

                    return (
                      <option key={account.id} value={account.id}>
                        {bankName} - {account.name} ({accountTypeLabel(account.type)})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="fg-form">
                <label>Tipo de arquivo</label>
                <select name="source_type" className="fg-select">
                  <option value="pdf">PDF de fatura/extrato</option>
                  <option value="csv">CSV</option>
                    <option value="manual_text">Texto colado</option>
                </select>
              </div>
            </div>

            <div className="fg-form">
              <label>Banco (parser)</label>
              <select name="bank_key" className="fg-select">
                <option value="nubank">Nubank</option>
                  <option value="itau">Itaú</option>
                <option value="bradesco">Bradesco</option>
                <option value="santander">Santander</option>
                <option value="banco_do_brasil">Banco do Brasil</option>
                <option value="caixa">Caixa</option>
                <option value="btg">BTG</option>
                <option value="portobank">Portobank</option>
                <option value="c6">C6</option>
                <option value="inter">Inter</option>
                <option value="mercado_pago">Mercado Pago</option>
                <option value="picpay">PicPay</option>
                  <option value="generic">Genérico</option>
              </select>
            </div>

            <div className="fg-grid-2">
              <div className="fg-form">
                <label>Arquivo PDF/CSV/TXT/OFX</label>
                <input name="file" type="file" accept=".pdf,.csv,.txt,.ofx" className="fg-input" />
              </div>

              <div className="fg-form">
                <label>Texto da fatura (alternativa)</label>
                <textarea
                  name="raw_text"
                  placeholder="Cole aqui as linhas da fatura/extrato, caso não envie arquivo"
                  className="fg-textarea"
                />
              </div>
            </div>

            <p className="fg-field-note">
              A importação sempre fica vinculada ao usuário autenticado e à conta selecionada.
            </p>

            <button className="fg-btn" disabled={!accounts?.length}>Importar transações</button>
          </form>
        </Card>

        <Card title="Histórico de importações">
          <div className="fg-table-wrap">
            <table className="fg-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Banco (parser)</th>
                  <th>Conta destino</th>
                  <th>Arquivo</th>
                  <th>Status</th>
                  <th>Detectadas</th>
                  <th>Importadas</th>
                  <th>Duplicadas</th>
                </tr>
              </thead>
              <tbody>
                {(imports || []).map((item: any) => {
                  const account = accountById.get(String(item.account_id));
                  const bank = account ? bankById.get(String(account.bank_id || "")) : null;
                  const bankName = bank?.name || account?.institution_name || "-";
                  const accountLabel = account ? `${bankName} - ${account.name}` : "-";

                  return (
                    <tr key={item.id}>
                      <td>{shortDate(item.created_at)}</td>
                      <td>{item.bank_key}</td>
                      <td>{accountLabel}</td>
                      <td>{item.file_name || "-"}</td>
                      <td>{item.status}</td>
                      <td>{item.total_detected}</td>
                      <td>{item.total_imported}</td>
                      <td>{item.total_duplicates}</td>
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

