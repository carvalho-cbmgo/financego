import { ReactNode } from "react";
import { LogoutButton } from "@/components/logout-button";
import { TopNavLinks } from "@/components/top-nav-links";

const navItems = [
  { href: "/dashboard", label: "Início" },
  { href: "/dashboard?tab=transactions", label: "Transações" },
  { href: "/budgets", label: "Orçamento" },
  { href: "/charts", label: "Gráficos" },
  { href: "/accounts", label: "Bancos & Contas" },
  { href: "/statements", label: "Importar" },
  { href: "/notifications", label: "Notificações" },
  { href: "/exports", label: "Exportar" },
];

export function PageShell({ children }: { children: ReactNode }) {
  const currentYear = new Date().getFullYear();

  return (
    <div className="shell-wrap">
      <header className="shell-topbar">
        <div className="shell-brand-mark">
          <span className="shell-brand-main">Finance</span>
          <span className="shell-brand-go">GO</span>
        </div>

        <nav className="shell-topnav" aria-label="Navegação principal">
          <TopNavLinks items={navItems} />
        </nav>

        <LogoutButton />
      </header>

      <main className="shell-main">
        {children}
        <footer className="fg-app-footer">{`© ${currentYear} Mayko Araújo de Carvalho. Todos os direitos reservados.`}</footer>
      </main>
    </div>
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
  borderRadius: 4,
  border: "1px solid #7f9c2b",
  background: "#a4be39",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};
