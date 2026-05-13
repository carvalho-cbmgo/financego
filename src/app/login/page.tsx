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
      setMessage(error ? error.message : "Conta criada. Verifique o e-mail, se necessário.");
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
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f6f7fb" }}>
      <form onSubmit={handleSubmit} style={{ width: 360, background: "#fff", padding: 24, borderRadius: 16, border: "1px solid #e5e7eb" }}>
        <h1 style={{ marginTop: 0 }}>Entrar</h1>
        <p style={{ color: "#6b7280" }}>Login simples com Supabase Auth.</p>
        <label>E-mail</label>
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" required style={input} />
        <label>Senha</label>
        <input value={password} onChange={e => setPassword(e.target.value)} type="password" required style={input} />
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button type="submit" style={primary}>{mode === "login" ? "Entrar" : "Criar conta"}</button>
          <button type="button" onClick={() => setMode(mode === "login" ? "signup" : "login")} style={secondary}>
            {mode === "login" ? "Criar conta" : "Fazer login"}
          </button>
        </div>
        <div style={{ marginTop: 14, color: "#374151", minHeight: 24 }}>{message}</div>
      </form>
    </main>
  );
}

const input = { width: "100%", marginTop: 6, marginBottom: 12, padding: "12px 10px", borderRadius: 10, border: "1px solid #d1d5db", boxSizing: "border-box" as const };
const primary = { flex: 1, padding: "12px 14px", borderRadius: 10, border: "none", background: "#111827", color: "#fff", fontWeight: 700 };
const secondary = { flex: 1, padding: "12px 14px", borderRadius: 10, border: "1px solid #d1d5db", background: "#fff", color: "#111827", fontWeight: 700 };
