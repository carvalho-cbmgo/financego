import { requireServerUser } from "@/lib/auth-server";
import { PageShell, Card, SectionIntro } from "@/components/ui";

export default async function ExportsPage() {
  await requireServerUser();

  return (
    <PageShell>
      <div className="fg-stack" style={{ maxWidth: 980 }}>
        <SectionIntro
          title="Exportacoes"
          subtitle="Baixe seus dados em formatos estruturados para auditoria, analise externa e backup."
        />

        <Card title="Excel estruturado" action={<span className="fg-chip">GET /api/export/excel</span>}>
          <p>Exporta transacoes, orcamento e metas em abas separadas.</p>
          <p className="fg-field-note">Requer login ativo e utiliza cookie seguro de sessao.</p>
        </Card>

        <Card title="PDF estruturado" action={<span className="fg-chip">GET /api/export/pdf</span>}>
          <p>Gera um relatorio pronto para imprimir ou salvar em PDF no navegador.</p>
          <p className="fg-field-note">Requer login ativo e utiliza cookie seguro de sessao.</p>
        </Card>
      </div>
    </PageShell>
  );
}

