"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { notifyGlobalLoading } from "@/components/global-loading-overlay";

export function MobileMonthPicker({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [monthRef, setMonthRef] = useState(value);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setMonthRef(value);
  }, [value]);

  function updateMonth(nextValue: string) {
    if (!nextValue) return;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(nextValue)) return;

    setMonthRef(nextValue);
    const params = new URLSearchParams(searchParams.toString());
    params.set("month_ref", nextValue);

    const nextHref = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    const currentHref = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    if (nextHref === currentHref) return;

    notifyGlobalLoading(true);
    startTransition(() => {
      router.replace(nextHref, { scroll: false });
    });
  }

  function shiftMonth(delta: number) {
    updateMonth(shiftMonthRef(monthRef, delta));
  }

  return (
    <div className="fg-mobile-month-nav">
      <button
        type="button"
        className="fg-mobile-month-btn"
        onClick={() => shiftMonth(-1)}
        disabled={isPending}
        aria-label="Mês anterior"
      >
        &lt;
      </button>
      <input
        type="month"
        className="fg-mobile-month-input"
        value={monthRef}
        onChange={(event) => updateMonth(event.target.value)}
        disabled={isPending}
        aria-label="Mês de referência"
      />
      <button
        type="button"
        className="fg-mobile-month-btn"
        onClick={() => shiftMonth(1)}
        disabled={isPending}
        aria-label="Próximo mês"
      >
        &gt;
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
