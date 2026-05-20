import { PageShell, SectionIntro, Card } from "@/components/ui";
import { requireServerSession } from "@/lib/auth-server";
import { createUserDb } from "@/lib/user-db";

export const dynamic = "force-dynamic";

type ProfileParams = {
  updated?: string;
  error?: string;
};

export default async function ProfilePage({ searchParams }: { searchParams: Promise<ProfileParams> }) {
  const { user, accessToken } = await requireServerSession();
  const supabase = createUserDb(accessToken);
  const params = await searchParams;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, created_at")
    .eq("id", user.id)
    .maybeSingle();

  const fullName = String(profile?.full_name || user.user_metadata?.full_name || "").trim();
  const email = String(profile?.email || user.email || "").trim();

  return (
    <PageShell>
      <SectionIntro
        title="Perfil"
        subtitle="Veja e mantenha atualizados os dados principais do seu cadastro no Finance GO."
      />

      <div className="fg-profile-grid">
        <Card title="Dados do usuário">
          <form action="/api/profile/update" method="post" className="fg-profile-form">
            <input type="hidden" name="return_url" value="/profile?updated=1" />

            <label className="fg-field-label">
              Nome completo
              <input
                name="full_name"
                required
                minLength={3}
                defaultValue={fullName}
                className="fg-input"
                placeholder="Informe seu nome completo"
                autoComplete="name"
              />
            </label>

            <label className="fg-field-label">
              E-mail de acesso
              <input value={email} className="fg-input" readOnly aria-readonly="true" />
            </label>

            {params.updated ? (
              <div className="fg-success-note" role="status">
                Perfil atualizado com sucesso.
              </div>
            ) : null}

            {params.error ? (
              <div className="fg-error-note" role="alert">
                Não foi possível salvar. Informe o nome completo.
              </div>
            ) : null}

            <div className="fg-profile-actions">
              <button className="fg-btn">Salvar alterações</button>
            </div>
          </form>
        </Card>

        <Card title="Como este dado será usado">
          <div className="fg-profile-help">
            <p>
              O nome completo ajuda o Finance GO a interpretar notificações de PIX e transferências,
              diferenciando recebimentos de terceiros, pagamentos realizados e movimentações entre suas próprias contas.
            </p>
            <p>
              Mantenha o nome igual ao que costuma aparecer nas notificações dos bancos para melhorar a classificação automática.
            </p>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
