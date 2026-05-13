import { PageShell, Card } from "@/components/ui";
import { requireServerSession } from "@/lib/auth-server";
import { createUserDb } from "@/lib/user-db";
import { shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function StatementsPage() {
  const { user, accessToken } = await requireServerSession();
  const supabaseAdmin = createUserDb(accessToken);
  const { data: imports } = await supabaseAdmin
    .from("statement_imports")
    .select("id, bank_key, source_type, file_name, status, total_detected, total_imported, total_duplicates, created_at")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <PageShell>
      <div style={{ display: "grid", gap: 16, maxWidth: 1100 }}>
        <h1 style={{ margin: 0 }}>Importar fatura/extrato</h1>

        <Card title="Importação estruturada">
          <form action="/api/statements/import" method="post" encType="multipart/form-data" style={{ display: "grid", gap: 12 }}>

            <label>Tipo de arquivo</label>
            <select name="source_type" style={input}>
              <option value="pdf">PDF de fatura/extrato</option>
              <option value="csv">CSV</option>
              <option value="manual_text">Texto colado</option>
            </select>

            <label>Banco</label>
            <select name="bank_key" style={input}>
              <option value="nubank">Nubank</option>
              <option value="itau">Itaú</option>
              <option value="bradesco">Bradesco</option>
              <option value="santander">Santander</option>
              <option value="banco_do_brasil">Banco do Brasil</option>
              <option value="caixa">Caixa</option>
              <option value="c6">C6</option>
              <option value="inter">Inter</option>
              <option value="mercado_pago">Mercado Pago</option>
              <option value="picpay">PicPay</option>
              <option value="generic">Genérico</option>
            </select>

            <label>Arquivo PDF/CSV/TXT exportado da fatura ou extrato</label>
            <input name="file" type="file" accept=".pdf,.csv,.txt,.ofx" style={input} />

            <label>Ou cole o texto da fatura</label>
            <textarea name="raw_text" placeholder="Cole aqui as linhas da fatura/extrato, caso não envie arquivo..." style={{ ...input, minHeight: 160 }} />

            <p style={{ color: "#6b7280", margin: 0 }}>
              Requer login ativo. A importação ficará vinculada ao usuário autenticado.
            </p>

            <button style={button}>Importar transações</button>
          </form>
        </Card>

        <Card title="Últimas importações">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <Th>Data</Th>
                <Th>Banco</Th>
                <Th>Arquivo</Th>
                <Th>Status</Th>
                <Th>Detectadas</Th>
                <Th>Importadas</Th>
                <Th>Duplicadas</Th>
              </tr>
            </thead>
            <tbody>
              {(imports || []).map((item: any) => (
                <tr key={item.id}>
                  <Td>{shortDate(item.created_at)}</Td>
                  <Td>{item.bank_key}</Td>
                  <Td>{item.file_name || "-"}</Td>
                  <Td>{item.status}</Td>
                  <Td>{item.total_detected}</Td>
                  <Td>{item.total_imported}</Td>
                  <Td>{item.total_duplicates}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </PageShell>
  );
}

const input = {
  padding: "12px 10px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  width: "100%",
  boxSizing: "border-box" as const,
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
