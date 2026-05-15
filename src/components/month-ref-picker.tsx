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

  return (
    <input
      type="month"
      value={monthRef}
      onChange={(event) => updateMonth(event.target.value)}
      className="fg-input fg-legacy-month-input"
      disabled={isPending}
      aria-label="Selecionar mes e ano"
    />
  );
}
