"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { brl } from "@/lib/format";
import { accountTypeLabel } from "@/lib/accounts";
import { notifyGlobalLoading } from "@/components/global-loading-overlay";

type AccountRow = {
  id: string;
  name: string;
  balance: number;
  type: string | null;
  bankName: string;
};

function stableList(value: string[]) {
  return [...value].sort().join("|");
}

export function AccountsFilterPanel(input: {
  accounts: AccountRow[];
  selectedAccountIds: string[];
  selectedBankId: string;
  currentTab: "overview" | "transactions";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<string[]>(input.selectedAccountIds);
  const selectedIdsKey = useMemo(() => stableList(input.selectedAccountIds), [input.selectedAccountIds]);

  useEffect(() => {
    setSelectedIds(input.selectedAccountIds);
  }, [selectedIdsKey, input.selectedAccountIds]);

  function navigateWith(nextSelectedIds: string[]) {
    const params = new URLSearchParams(window.location.search);

    params.set("tab", input.currentTab);
    if (input.selectedBankId) params.set("bank_id", input.selectedBankId);
    else params.delete("bank_id");

    params.delete("account_id");

    if (nextSelectedIds.length) {
      params.set("account_ids", nextSelectedIds.join(","));
    } else {
      params.delete("account_ids");
    }

    const nextQuery = params.toString();
    const href = nextQuery ? `/dashboard?${nextQuery}` : "/dashboard";
    const current = `${window.location.pathname}${window.location.search}`;

    if (href === current) return;

    notifyGlobalLoading(true);
    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  }

  function toggleOne(accountId: string) {
    const exists = selectedIds.includes(accountId);
    const next = exists
      ? selectedIds.filter((id) => id !== accountId)
      : [...selectedIds, accountId];

    setSelectedIds(next);
    navigateWith(next);
  }

  function selectAll() {
    const next = input.accounts.map((item) => item.id);
    setSelectedIds(next);
    navigateWith(next);
  }

  function clearAll() {
    setSelectedIds([]);
    navigateWith([]);
  }

  if (!input.accounts.length) {
    return <div className="fg-empty">Sem contas.</div>;
  }

  return (
    <div className="fg-account-list-wrap">
      <div className="fg-account-actions">
        <button type="button" className="fg-btn-secondary" onClick={selectAll} disabled={isPending}>
          Marcar todas
        </button>
        <button type="button" className="fg-btn-secondary" onClick={clearAll} disabled={isPending}>
          Limpar
        </button>
      </div>

      <div className="fg-account-list">
        {input.accounts.map((account) => {
          const checked = selectedIds.includes(account.id);
          const typeLabel = accountTypeLabel(account.type);
          const isCreditCard = typeLabel === "CARTAO_DE_CREDITO";
          const accountName = String(account.name || "").trim() || "Sem nome";
          const displayName = `${account.bankName} - ${accountName}`;

          return (
            <label key={account.id} className={`fg-account-item ${checked ? "is-checked" : ""}`}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleOne(account.id)}
                disabled={isPending}
              />
              <span className="fg-account-item-main">
                <span className="fg-account-item-text" title={displayName}>
                  {displayName}
                </span>
                <span className={`fg-account-item-kind ${isCreditCard ? "is-credit" : "is-checking"}`}>
                  {isCreditCard ? "Crédito" : "Corrente"}
                </span>
              </span>
              <span className="fg-account-item-balance">{brl(account.balance || 0)}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
