"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";
import { useRouter } from "next/navigation";

function isMobileClient() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  return /android|iphone|ipad|ipod|mobile|blackberry|iemobile|opera mini/.test(ua);
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("maykocarvalho@gmail.com");
  const [password, setPassword] = useState("123456");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setMessage("");

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
        setMessage("Não foi possível iniciar sessão no servidor.");
        return;
      }

      router.push(isMobileClient() ? "/mobile" : "/dashboard");
    } catch (err: any) {
      setMessage(err?.message || "Ocorreu um erro inesperado.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="fg-login-screen">
      <div className="fg-login-backdrop" aria-hidden="true" />

      <section className="fg-login-shell" aria-label="Acesso ao Finance GO">
        <section className="fg-login-card">
          <div className="fg-login-brand-wordmark fg-login-brand-wordmark-center">
            <span className="fg-login-brand-finance">Finance</span>
            <span className="fg-login-brand-go">GO</span>
          </div>

          <div className="fg-login-mode-switch" role="tablist" aria-label="Modo de acesso">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              className={`fg-login-mode-btn ${mode === "login" ? "is-active" : ""}`}
              onClick={() => {
                setMode("login");
                setMessage("");
              }}
              disabled={isSubmitting}
            >
              Entrar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signup"}
              className={`fg-login-mode-btn ${mode === "signup" ? "is-active" : ""}`}
              onClick={() => {
                setMode("signup");
                setMessage("");
              }}
              disabled={isSubmitting}
            >
              Criar conta
            </button>
          </div>

          <h1 className="fg-login-title">{mode === "login" ? "Acesse sua conta" : "Abra sua conta"}</h1>

          <form onSubmit={handleSubmit} className="fg-form fg-login-form">
            <label className="fg-login-label">
              E-mail
              <span className="fg-login-input-wrap">
                <span className="fg-login-input-icon" aria-hidden="true">@</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  required
                  autoComplete="email"
                  className="fg-input fg-login-input"
                  placeholder="seuemail@exemplo.com"
                />
              </span>
            </label>

            <label className="fg-login-label">
              Senha
              <span className="fg-login-input-wrap">
                <span className="fg-login-input-icon" aria-hidden="true">*</span>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className="fg-input fg-login-input"
                  placeholder="Digite sua senha"
                />
                <button
                  type="button"
                  className="fg-login-password-toggle"
                  onClick={() => setShowPassword((value) => !value)}
                  disabled={isSubmitting}
                >
                  {showPassword ? "Ocultar" : "Mostrar"}
                </button>
              </span>
            </label>

            <button type="submit" className="fg-btn fg-login-submit" disabled={isSubmitting}>
              {isSubmitting ? "Acessando..." : mode === "login" ? "Acessar" : "Criar conta no Finance GO"}
            </button>
          </form>

          {message ? <div className="fg-login-message" role="status" aria-live="polite">{message}</div> : null}
        </section>
      </section>

      <footer className="fg-login-footer">© {new Date().getFullYear()} Mayko Araújo de Carvalho. Todos os direitos reservados.</footer>
    </main>
  );
}
