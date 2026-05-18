"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase";
import { notifyGlobalLoading } from "@/components/global-loading-overlay";

export function LogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function logout() {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    notifyGlobalLoading(true);

    try {
      await fetch("/api/auth/session", { method: "DELETE" });
      await supabaseBrowser.auth.signOut({ scope: "local" });
      router.replace("/login");
    } finally {
      notifyGlobalLoading(false);
      setIsLoggingOut(false);
    }
  }

  return (
    <button type="button" className="shell-user-pill" onClick={logout} disabled={isLoggingOut}>
      {isLoggingOut ? "Saindo..." : "Sair"}
    </button>
  );
}
