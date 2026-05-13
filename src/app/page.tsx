import Link from "next/link";

export default function Home() {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 32 }}>
      <h1 style={{ fontSize: 34, marginBottom: 8 }}>Finance MVP v3</h1>
      <p style={{ color: "#4b5563", lineHeight: 1.6 }}>
        Controle financeiro pessoal com Open Finance, dashboard, categorias editáveis, orçamento mensal e metas financeiras.
      </p>
      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        <Link href="/dashboard" style={btn("#111827", "#fff")}>Abrir dashboard</Link>
        <Link href="/budgets" style={btn("#fff", "#111827", "#d1d5db")}>Abrir orçamento</Link>
        <Link href="/goals" style={btn("#fff", "#111827", "#d1d5db")}>Abrir metas</Link>
      </div>
    </main>
  );
}

function btn(bg: string, color: string, border = bg) {
  return {
    background: bg,
    color,
    padding: "12px 16px",
    borderRadius: 12,
    textDecoration: "none",
    border: `1px solid ${border}`,
    fontWeight: 700 as const,
  };
}
