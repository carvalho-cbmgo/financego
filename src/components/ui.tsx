import Link from "next/link";
import { ReactNode } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard?tab=transactions", label: "Transacoes" },
  { href: "/accounts", label: "Bancos e Contas" },
  { href: "/budgets", label: "Orcamento" },
  { href: "/goals", label: "Metas" },
  { href: "/notifications", label: "Notificacoes" },
  { href: "/charts", label: "Graficos" },
  { href: "/statements", label: "Importar fatura" },
  { href: "/exports", label: "Exportacoes" },
  { href: "/refunds", label: "Estornos" },
  { href: "/login", label: "Login" },
];

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="shell-wrap">
      <div className="shell-grid">
        <aside className="shell-aside">
          <div className="shell-brand-block">
            <div className="shell-brand-caption">Sistema</div>
            <div className="shell-brand-title">Finance GO</div>
            <div className="shell-brand-subtitle">Gestao inteligente por banco, conta e consolidacao.</div>
          </div>

          <nav className="shell-nav">
            {navItems.map((item) => (
              <NavLink key={item.href} href={item.href}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="shell-main">{children}</main>
      </div>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="shell-nav-link">
      {children}
    </Link>
  );
}

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="fg-card">
      <div className="fg-card-title">{title}</div>
      {children}
    </section>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="fg-stat">
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
