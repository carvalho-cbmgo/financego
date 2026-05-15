"use client";

import { useEffect, useRef, useState } from "react";

const GLOBAL_LOADING_EVENT = "fg:global-loading";

type GlobalLoadingEventDetail = {
  active: boolean;
};

function isDbRequestUrl(input: string) {
  if (!input) return false;

  if (input.startsWith("/api/")) return true;

  try {
    const parsed = new URL(input, window.location.origin);
    return parsed.origin === window.location.origin && parsed.pathname.startsWith("/api/");
  } catch {
    return false;
  }
}

function requestUrl(input: RequestInfo | URL) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function requestMethod(input: RequestInfo | URL, init?: RequestInit) {
  if (init?.method) return String(init.method).toUpperCase();
  if (input instanceof Request) return String(input.method || "GET").toUpperCase();
  return "GET";
}

function isInternalUrl(input: string) {
  if (!input) return false;

  try {
    const current = new URL(window.location.href);
    const parsed = new URL(input, current.origin);
    return parsed.origin === current.origin;
  } catch {
    return false;
  }
}

function shouldTrackAnchorNavigation(anchor: HTMLAnchorElement) {
  const hrefAttr = anchor.getAttribute("href") || "";
  const target = (anchor.getAttribute("target") || "").toLowerCase();

  if (!hrefAttr || hrefAttr.startsWith("#") || hrefAttr.startsWith("javascript:")) return false;
  if (target && target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;

  if (!isInternalUrl(anchor.href)) return false;

  try {
    const current = new URL(window.location.href);
    const next = new URL(anchor.href, current.origin);
    if (next.pathname === current.pathname && next.search === current.search) return false;
  } catch {
    return false;
  }

  return true;
}

export default function GlobalLoadingOverlay() {
  const [visible, setVisible] = useState(false);

  const pendingCountRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearSafetyTimeout() {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }

  function armSafetyTimeout() {
    clearSafetyTimeout();
    timeoutRef.current = setTimeout(() => {
      pendingCountRef.current = 0;
      setVisible(false);
      timeoutRef.current = null;
    }, 20000);
  }

  function start() {
    pendingCountRef.current += 1;
    setVisible(true);
    armSafetyTimeout();
  }

  function stop() {
    pendingCountRef.current = Math.max(0, pendingCountRef.current - 1);
    if (pendingCountRef.current === 0) {
      clearSafetyTimeout();
      setVisible(false);
    }
  }

  function finishAll() {
    pendingCountRef.current = 0;
    clearSafetyTimeout();
    setVisible(false);
  }

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = requestMethod(input, init);
      const track = isDbRequestUrl(url) || method !== "GET";

      if (track) start();

      try {
        return await originalFetch(input, init);
      } finally {
        if (track) stop();
      }
    }) as typeof window.fetch;

    const onSubmit = (event: Event) => {
      if (!(event.target instanceof HTMLFormElement)) return;
      const form = event.target;
      const action = form.action || "";
      const method = String(form.getAttribute("method") || "get").toUpperCase();
      const track = method !== "GET" || isDbRequestUrl(action) || isInternalUrl(action);
      if (track) start();
    };

    const onDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!(event.target instanceof Element)) return;

      const anchor = event.target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (!shouldTrackAnchorNavigation(anchor)) return;

      start();
    };

    const onGlobalEvent = (event: Event) => {
      const customEvent = event as CustomEvent<GlobalLoadingEventDetail>;
      if (customEvent.detail?.active) start();
      else stop();
    };

    const onUrlMutate = () => {
      finishAll();
    };

    const originalPushState = window.history.pushState.bind(window.history);
    const originalReplaceState = window.history.replaceState.bind(window.history);

    window.history.pushState = function pushState(...args) {
      const result = originalPushState(...args);
      onUrlMutate();
      return result;
    };

    window.history.replaceState = function replaceState(...args) {
      const result = originalReplaceState(...args);
      onUrlMutate();
      return result;
    };

    document.addEventListener("submit", onSubmit, true);
    document.addEventListener("click", onDocumentClick, true);
    window.addEventListener("popstate", onUrlMutate);
    window.addEventListener(GLOBAL_LOADING_EVENT, onGlobalEvent as EventListener);

    return () => {
      window.fetch = originalFetch;
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;

      document.removeEventListener("submit", onSubmit, true);
      document.removeEventListener("click", onDocumentClick, true);
      window.removeEventListener("popstate", onUrlMutate);
      window.removeEventListener(GLOBAL_LOADING_EVENT, onGlobalEvent as EventListener);

      finishAll();
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fg-global-loading" role="status" aria-live="polite" aria-label="Carregando">
      <div className="fg-global-loading-box">Carregando...</div>
    </div>
  );
}

export function notifyGlobalLoading(active: boolean) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<GlobalLoadingEventDetail>(GLOBAL_LOADING_EVENT, { detail: { active } }));
}
