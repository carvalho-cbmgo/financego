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
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setMessage("Carregando...");

    try {
      if (mode === "signup") {
        const { error } = await supabaseBrowser.auth.signUp({ email, password });
        setMessage(error ? error.message : "Conta criada. Verifique o e-mail para confirmar o cadastro.");
        return;
      }

      const { data, error } = await supabaseBrowser.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage(error.message);
        return;
      }

      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: data.session?.access_token }),
      });

      if (!response.ok) {
        setMessage("Nao foi possivel iniciar sessao no servidor.");
        return;
      }

      router.push("/dashboard");
    } catch (err: any) {
      setMessage(err?.message || "Ocorreu um erro inesperado.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="fg-login-screen">
      <div className="fg-login-backdrop" aria-hidden="true" />

      <section className="fg-login-card" aria-label="Acesso ao Finance GO">
        <div className="fg-login-badge">Finance GO</div>
        <h1 className="fg-login-title">{mode === "login" ? "Entrar" : "Criar conta"}</h1>
        <p className="fg-login-subtitle">Use seu e-mail e senha para acessar seu controle financeiro.</p>

        <form onSubmit={handleSubmit} className="fg-form fg-login-form">
          <label className="fg-login-label">
            E-mail
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              autoComplete="email"
              className="fg-input"
            />
          </label>

          <label className="fg-login-label">
            Senha
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="fg-input"
            />
          </label>

          <button type="submit" className="fg-btn fg-login-submit" disabled={isSubmitting}>
            {isSubmitting ? "Carregando..." : mode === "login" ? "Entrar" : "Criar conta"}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setMessage("");
            }}
            className="fg-login-switch"
            disabled={isSubmitting}
          >
            {mode === "login" ? "Ainda nao tem conta? Criar agora" : "Ja tenho conta"}
          </button>
        </form>

        <div className="fg-login-message" role="status" aria-live="polite">{message}</div>
      </section>

      <footer className="fg-login-footer">© {new Date().getFullYear()} Mayko Araujo de Carvalho. Todos os direitos reservados.</footer>
    </main>
  );
}
