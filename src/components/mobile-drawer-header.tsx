"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileMonthPicker } from "@/components/mobile-month-picker";
import { supabaseBrowser } from "@/lib/supabase";

type MobileDrawerHeaderProps = {
  monthRef: string;
  profileLabel: string;
  lastSyncText: string;
};

export function MobileDrawerHeader({ monthRef, profileLabel, lastSyncText }: MobileDrawerHeaderProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  function openDrawer() {
    setIsOpen(true);
  }

  function closeDrawer() {
    setIsOpen(false);
  }

  function goToSection(sectionId: string) {
    closeDrawer();
    requestAnimationFrame(() => {
      const target = document.getElementById(sectionId);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      window.location.hash = sectionId;
    });
  }

  function goToPath(path: string) {
    closeDrawer();
    router.push(path);
  }

  async function logout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    closeDrawer();

    try {
      await fetch("/api/auth/session", { method: "DELETE" });
      await supabaseBrowser.auth.signOut({ scope: "local" });
    } finally {
      router.replace("/login");
      router.refresh();
      setIsLoggingOut(false);
    }
  }

  return (
    <>
      <header className="fg-mobile-topbar">
        <div className="fg-mobile-topbar-row">
          <button type="button" className="fg-mobile-icon-btn" aria-label="Abrir menu lateral" onClick={openDrawer}>
            {"\u2630"}
          </button>
          <div className="fg-mobile-title">Visao geral</div>
          <div className="fg-mobile-topbar-actions">
            <button
              type="button"
              className="fg-mobile-icon-btn"
              aria-label="Ir para extrato mensal"
              onClick={() => goToSection("extrato-mensal")}
            >
              {"\u{1F4C5}"}
            </button>
            <button
              type="button"
              className="fg-mobile-icon-btn"
              aria-label="Ir para ultimas alteracoes"
              onClick={() => goToSection("ultimas-alteracoes")}
            >
              {"\u{1F50E}"}
            </button>
            <button
              type="button"
              className="fg-mobile-icon-btn"
              aria-label="Abrir configuracoes"
              onClick={() => goToPath(`/mobile/pair?month_ref=${monthRef}`)}
            >
              {"\u22EE"}
            </button>
            <button
              type="button"
              className="fg-mobile-icon-btn"
              aria-label="Deslogar"
              title="Deslogar"
              onClick={logout}
              disabled={isLoggingOut}
            >
              {"\u23FB"}
            </button>
          </div>
        </div>

        <MobileMonthPicker value={monthRef} />
      </header>

      <div className={`fg-mobile-drawer-backdrop ${isOpen ? "is-open" : ""}`} onClick={closeDrawer} aria-hidden={!isOpen} />

      <aside className={`fg-mobile-drawer ${isOpen ? "is-open" : ""}`} aria-label="Navegacao mobile">
        <div className="fg-mobile-drawer-head">
          <div className="fg-mobile-drawer-profile">{profileLabel}</div>
        </div>

        <nav className="fg-mobile-drawer-nav">
          <button type="button" className="fg-mobile-drawer-item is-active" onClick={() => goToPath(`/mobile?month_ref=${monthRef}`)}>
            <span className="fg-mobile-drawer-item-icon">VG</span>
            <span>Visao geral</span>
          </button>
          <button type="button" className="fg-mobile-drawer-item" onClick={() => goToSection("saldo-das-contas")}>
            <span className="fg-mobile-drawer-item-icon">SC</span>
            <span>Saldo das contas</span>
          </button>
          <button type="button" className="fg-mobile-drawer-item" onClick={() => goToSection("extrato-mensal")}>
            <span className="fg-mobile-drawer-item-icon">EM</span>
            <span>Extrato mensal</span>
          </button>
          <button type="button" className="fg-mobile-drawer-item" onClick={() => goToSection("grafico-mensal")}>
            <span className="fg-mobile-drawer-item-icon">GM</span>
            <span>Grafico mensal</span>
          </button>
        </nav>

        <div className="fg-mobile-drawer-footer">
          <Link href={`/mobile/pair?month_ref=${monthRef}`} className="fg-mobile-drawer-settings" onClick={closeDrawer}>
            Configuracoes
          </Link>
          <button type="button" className="fg-mobile-drawer-settings" onClick={logout} disabled={isLoggingOut}>
            {isLoggingOut ? "Saindo..." : "Sair"}
          </button>
          <div className="fg-mobile-drawer-sync">{lastSyncText}</div>
        </div>
      </aside>
    </>
  );
}
