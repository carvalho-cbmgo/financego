import Link from "next/link";
import { ReactNode } from "react";

const navItems = [
  { href: "/dashboard", label: "Inicio", code: "IN" },
  { href: "/dashboard?tab=transactions", label: "Registrar transacao", code: "TX" },
  { href: "/statements", label: "Extrato e importacoes", code: "EX" },
  { href: "/accounts", label: "Bancos e contas", code: "BC" },
  { href: "/budgets", label: "Orcamento", code: "OR" },
  { href: "/goals", label: "Metas", code: "MT" },
  { href: "/charts", label: "Graficos", code: "GR" },
  { href: "/notifications", label: "Notificacoes", code: "NT" },
  { href: "/exports", label: "Exportacoes", code: "XP" },
  { href: "/refunds", label: "Estornos", code: "ES" },
];

export function PageShell({ children }: { children: ReactNode }) {
  const currentYear = new Date().getFullYear();

  return (
    <div className="shell-wrap">
      <div className="shell-grid">
        <aside className="shell-aside">
          <div className="shell-brand-block">
            <div className="shell-logo-mark" aria-hidden="true">FG</div>
            <div>
              <div className="shell-brand-title">Finance GO</div>
              <div className="shell-brand-subtitle">Controle financeiro pessoal por banco e conta</div>
            </div>
          </div>

          <nav className="shell-nav">
            {navItems.map((item) => (
              <NavLink key={item.href} href={item.href} code={item.code}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="shell-aside-foot">
            <Link href="/login" className="shell-nav-link shell-nav-link-secondary">
              <span className="shell-nav-icon">LG</span>
              <span className="shell-nav-label">Trocar usuario</span>
            </Link>
          </div>
        </aside>

        <main className="shell-main">
          {children}
          <footer className="fg-app-footer">
            {`Â© ${currentYear} Mayko Araujo de Carvalho. Todos os direitos reservados.`}
          </footer>
        </main>
      </div>
    </div>
  );
}

function NavLink({ href, code, children }: { href: string; code: string; children: ReactNode }) {
  return (
    <Link href={href} className="shell-nav-link">
      <span className="shell-nav-icon">{code}</span>
      <span className="shell-nav-label">{children}</span>
    </Link>
  );
}

export function SectionIntro({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="fg-page-header">
      <div>
        <h1 className="fg-page-title">{title}</h1>
        {subtitle ? <p className="fg-page-subtitle">{subtitle}</p> : null}
      </div>
      {action ? <div className="fg-page-action">{action}</div> : null}
    </header>
  );
}

export function Card({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="fg-card">
      <div className="fg-card-head">
        <div className="fg-card-title">{title}</div>
        {action ? <div>{action}</div> : null}
      </div>
      <div className="fg-card-body">{children}</div>
    </section>
  );
}

export function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  return (
    <div className={`fg-stat fg-stat-${tone}`}>
      <div className="fg-stat-label">{label}</div>
      <div className="fg-stat-value">{value}</div>
    </div>
  );
}

export const primaryBtn = {
  padding: "12px 16px",
  borderRadius: 12,
  border: "none",
  background: "var(--brand)",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

