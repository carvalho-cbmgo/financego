"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { notifyGlobalLoading } from "@/components/global-loading-overlay";

export function PreviousBalanceToggle(input: {
  checked: boolean;
  label?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [checked, setChecked] = useState(input.checked);

  useEffect(() => {
    setChecked(input.checked);
  }, [input.checked]);

  function onToggle(nextChecked: boolean) {
    setChecked(nextChecked);

    const params = new URLSearchParams(window.location.search);
    if (nextChecked) params.delete("include_previous_balance");
    else params.set("include_previous_balance", "0");

    const href = params.toString() ? `/dashboard?${params.toString()}` : "/dashboard";
    const current = `${window.location.pathname}${window.location.search}`;
    if (href === current) return;

    notifyGlobalLoading(true);
    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  }

  return (
    <label className="fg-checkbox-row">
      <input
        type="checkbox"
        checked={checked}
        disabled={isPending}
        onChange={(event) => onToggle(event.target.checked)}
      />
      {input.label || "Incluir saldo anterior"}
    </label>
  );
}
