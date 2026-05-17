"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { notifyGlobalLoading } from "@/components/global-loading-overlay";

export function MonthRefPicker({ value }: { value: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [monthRef, setMonthRef] = useState(value);

  useEffect(() => {
    setMonthRef(value);
  }, [value]);

  function updateMonth(nextValue: string) {
    if (!nextValue) return;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(nextValue)) return;

    setMonthRef(nextValue);

    const params = new URLSearchParams(window.location.search);
    params.set("month_ref", nextValue);

    const nextHref = `/dashboard?${params.toString()}`;
    const currentHref = `${window.location.pathname}${window.location.search}`;
    if (nextHref === currentHref) return;

    notifyGlobalLoading(true);
    startTransition(() => {
      router.replace(nextHref, { scroll: false });
    });
  }

  function shiftMonth(delta: number) {
    const nextValue = shiftMonthRef(monthRef, delta);
    updateMonth(nextValue);
  }

  return (
    <div className="fg-legacy-month-nav">
      <button
        type="button"
        className="fg-btn-secondary fg-legacy-month-shift"
        onClick={() => shiftMonth(-1)}
        disabled={isPending}
        aria-label="Ir para o mes anterior"
        title="Mes anterior"
      >
        ‹
      </button>
      <input
        type="month"
        value={monthRef}
        onChange={(event) => updateMonth(event.target.value)}
        className="fg-input fg-legacy-month-input"
        disabled={isPending}
        aria-label="Selecionar mes e ano"
      />
      <button
        type="button"
        className="fg-btn-secondary fg-legacy-month-shift"
        onClick={() => shiftMonth(1)}
        disabled={isPending}
        aria-label="Ir para o proximo mes"
        title="Proximo mes"
      >
        ›
      </button>
    </div>
  );
}

function shiftMonthRef(value: string, delta: number) {
  const match = String(value || "").match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  if (!match) return value;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const date = new Date(Date.UTC(year, month - 1, 1));
  date.setUTCMonth(date.getUTCMonth() + delta);

  const nextYear = date.getUTCFullYear();
  const nextMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${nextYear}-${nextMonth}`;
}
