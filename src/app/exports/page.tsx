import { requireServerUser } from "@/lib/auth-server";
import { PageShell, Card } from "@/components/ui";

export default async function ExportsPage() {
  await requireServerUser();
  return (
    <PageShell>
      <div style={{ display: "grid", gap: 16, maxWidth: 900 }}>
        <h1 style={{ margin: 0 }}>Exportações</h1>

        <Card title="Excel estruturado">
          <p>Exporta transações, orçamento e metas em abas separadas.</p>
          <code>GET /api/export/excel</code>
          <p>Requer login ativo. O navegador usará o cookie seguro da sessão.</p>
        </Card>

        <Card title="PDF estruturado">
          <p>Gera um relatório HTML pronto para imprimir/salvar em PDF pelo navegador.</p>
          <code>GET /api/export/pdf</code>
          <p>Requer login ativo. O navegador usará o cookie seguro da sessão.</p>
        </Card>
      </div>
    </PageShell>
  );
}
