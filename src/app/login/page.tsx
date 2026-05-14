"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("Processando...");

    if (mode === "signup") {
      const { error } = await supabaseBrowser.auth.signUp({ email, password });
      setMessage(error ? error.message : "Conta criada. Verifique o e-mail, se necessario.");
      return;
    }

    const { data, error } = await supabaseBrowser.auth.signInWithPassword({ email, password });
    if (error) return setMessage(error.message);

    await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: data.session?.access_token }),
    });

    router.push("/dashboard");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          width: "min(1040px, 100%)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 14,
        }}
      >
        <section
          style={{
            borderRadius: 26,
            padding: 26,
            background: "linear-gradient(165deg, #0f2a33 0%, #14556a 100%)",
            color: "#ebfbff",
            boxShadow: "0 28px 50px rgba(11, 34, 43, 0.35)",
          }}
        >
          <div style={{ fontSize: 12, opacity: .78, letterSpacing: ".14em", textTransform: "uppercase" }}>Plataforma</div>
          <h1 style={{ fontSize: 48, margin: "6px 0 10px" }}>Finance GO</h1>
          <p style={{ color: "#b9d6e0", maxWidth: 520, lineHeight: 1.7 }}>
            Controle financeiro moderno e intuitivo com cadastro de bancos, contas individualizadas,
            consolidacao de gastos e previsao de despesas futuras.
          </p>

          <div style={{ marginTop: 22, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Feature title="Visao por Banco" text="Analise consolidada por instituicao." />
            <Feature title="Visao por Conta" text="Acompanhe cartao e conta corrente separadamente." />
            <Feature title="Transacoes Futuras" text="Marque como nao consolidada para previsao." />
            <Feature title="Dashboard Inteligente" text="Filtros dinamicos e indicadores claros." />
          </div>
        </section>

        <section
          style={{
            borderRadius: 24,
            background: "#fff",
            border: "1px solid var(--line)",
            padding: 24,
            boxShadow: "var(--shadow)",
            alignSelf: "center",
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: 4 }}>{mode === "login" ? "Entrar" : "Criar conta"}</h2>
          <p style={{ color: "var(--muted)", marginTop: 0 }}>
            Acesse sua area no Finance GO.
          </p>

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 10 }}>
            <label>
              E-mail
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required style={input} />
            </label>

            <label>
              Senha
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required style={input} />
            </label>

            <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr", marginTop: 8 }}>
              <button type="submit" style={primary}>
                {mode === "login" ? "Entrar" : "Criar conta"}
              </button>
              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
                style={secondary}
              >
                {mode === "login" ? "Nova conta" : "Ja tenho conta"}
              </button>
            </div>
          </form>

          <div style={{ marginTop: 12, color: "#30424d", minHeight: 24 }}>{message}</div>
        </section>
      </div>
    </main>
  );
}

function Feature({ title, text }: { title: string; text: string }) {
  return (
    <div style={{ border: "1px solid rgba(171, 224, 242, 0.2)", background: "rgba(11, 28, 35, 0.2)", borderRadius: 14, padding: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 13, color: "#bfdce8" }}>{text}</div>
    </div>
  );
}

const input = {
  width: "100%",
  marginTop: 6,
  padding: "12px 10px",
  borderRadius: 12,
  border: "1px solid #c8d9df",
  boxSizing: "border-box" as const,
};

const primary = {
  padding: "12px 14px",
  borderRadius: 12,
  border: "none",
  background: "var(--brand)",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

const secondary = {
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #cedce2",
  background: "#fff",
  color: "#17252f",
  fontWeight: 700,
  cursor: "pointer",
};
