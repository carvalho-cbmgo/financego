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
    <main style={{ minHeight: "100vh", display: "grid", alignContent: "center", padding: 16, gap: 10 }}>
      <div style={{ width: "min(1120px, 100%)", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))", gap: 14 }}>
        <section
          style={{
            borderRadius: 24,
            background: "linear-gradient(145deg, #0f8e60, #1668b3)",
            color: "#f8fcff",
            padding: 28,
            boxShadow: "0 20px 46px rgba(19, 33, 60, 0.22)",
          }}
        >
          <div style={{ fontSize: 13, letterSpacing: ".14em", textTransform: "uppercase", opacity: 0.84 }}>Bem-vindo</div>
          <h1 style={{ marginTop: 10, fontSize: 48 }}>Finance GO</h1>
          <p style={{ marginTop: 10, maxWidth: 540, color: "#dbeeff", lineHeight: 1.65 }}>
            Sistema de controle financeiro pessoal com cadastro separado de bancos e contas,
            transacoes consolidadas ou previstas e analise inteligente por instituicao.
          </p>

          <div className="fg-grid-2" style={{ marginTop: 18 }}>
            <Feature title="Visao geral" text="Saldo, entradas e saidas em cards objetivos." />
            <Feature title="Por banco/conta" text="Analise separada para cada instituicao e conta." />
            <Feature title="Previsao futura" text="Use NAO CONSOLIDADA para gastos planejados." />
            <Feature title="Fluxo pratico" text="Cadastro rapido, importacao e ajustes no mesmo painel." />
          </div>
        </section>

        <section className="fg-card" style={{ alignSelf: "center", background: "#fff" }}>
          <div className="fg-card-head">
            <h2 style={{ margin: 0, fontSize: 28 }}>{mode === "login" ? "Entrar" : "Criar conta"}</h2>
          </div>
          <p className="fg-field-note" style={{ marginBottom: 12 }}>
            Acesse seu painel pessoal do Finance GO.
          </p>

          <form onSubmit={handleSubmit} className="fg-form">
            <label>
              E-mail
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="fg-input" />
            </label>

            <label>
              Senha
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required className="fg-input" />
            </label>

            <div className="fg-grid-2" style={{ marginTop: 8 }}>
              <button type="submit" className="fg-btn">
                {mode === "login" ? "Entrar" : "Criar conta"}
              </button>
              <button type="button" onClick={() => setMode(mode === "login" ? "signup" : "login")} className="fg-btn-secondary">
                {mode === "login" ? "Nova conta" : "Ja tenho conta"}
              </button>
            </div>
          </form>

          <div style={{ marginTop: 12, minHeight: 24, color: "#334155" }}>{message}</div>
        </section>
      </div>
      <footer className="fg-app-footer">Â© {new Date().getFullYear()} Mayko Araujo de Carvalho. Todos os direitos reservados.</footer>
    </main>
  );
}

function Feature({ title, text }: { title: string; text: string }) {
  return (
    <div
      style={{
        border: "1px solid rgba(239, 250, 255, 0.32)",
        borderRadius: 14,
        padding: 12,
        background: "rgba(10, 26, 56, 0.18)",
      }}
    >
      <div style={{ fontWeight: 800 }}>{title}</div>
      <div style={{ marginTop: 4, fontSize: 13, color: "#d8eeff" }}>{text}</div>
    </div>
  );
}

