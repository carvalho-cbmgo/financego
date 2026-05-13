import Link from "next/link";
import { ReactNode } from "react";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#f6f7fb", color: "#111827" }}>
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "100vh" }}>
        <aside style={{ background: "#0f172a", color: "#fff", padding: 20 }}>
          <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 24 }}>Finance MVP</div>
          <nav style={{ display: "grid", gap: 10 }}>
            <NavLink href="/dashboard">Dashboard</NavLink>
            <NavLink href="/dashboard?tab=transactions">Transações</NavLink>
            <NavLink href="/budgets">Orçamento</NavLink>
            <NavLink href="/goals">Metas</NavLink>
            <NavLink href="/notifications">Notificações</NavLink>
            <NavLink href="/charts">Gráficos</NavLink>
            <NavLink href="/statements">Importar fatura</NavLink>
            <NavLink href="/exports">Exportações</NavLink>
            <NavLink href="/refunds">Estornos</NavLink>
            <NavLink href="/login">Login</NavLink>
          </nav>
        </aside>
        <main style={{ padding: 24 }}>{children}</main>
      </div>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} style={{
      padding: "10px 12px",
      borderRadius: 10,
      background: "rgba(255,255,255,0.08)",
      color: "#fff",
      textDecoration: "none",
      display: "block"
    }}>
      {children}
    </Link>
  );
}

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ background: "#fff", borderRadius: 16, padding: 18, boxShadow: "0 8px 24px rgba(15,23,42,0.05)", border: "1px solid #e5e7eb" }}>
      <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 10 }}>{title}</div>
      {children}
    </section>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "#fff", borderRadius: 16, padding: 18, border: "1px solid #e5e7eb" }}>
      <div style={{ color: "#6b7280", fontSize: 13 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{value}</div>
    </div>
  );
}

export const primaryBtn = {
  padding: "12px 16px",
  borderRadius: 12,
  border: "none",
  background: "#111827",
  color: "#fff",
  fontWeight: 700,
};
