"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { shortDate } from "@/lib/format";
import { accountTypeLabel } from "@/lib/accounts";
import { notifyGlobalLoading } from "@/components/global-loading-overlay";

type CategorySelectOption = {
  value: string;
  label: string;
  depth?: number;
};

export function TransactionsTable(input: {
  txs: any[];
  banks: any[];
  accounts: any[];
  categoryOptions: CategorySelectOption[];
  returnUrl: string;
  selectedEditTxId: string;
}) {
  const router = useRouter();
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);
  const [isWorking, setIsWorking] = useState(false);
  const [message, setMessage] = useState("");

  const accountById = useMemo(
    () => new Map<string, any>((input.accounts || []).map((acc: any) => [String(acc.id), acc])),
    [input.accounts],
  );
  const bankById = useMemo(
    () => new Map<string, any>((input.banks || []).map((bank: any) => [String(bank.id), bank])),
    [input.banks],
  );

  const grouped = useMemo(() => groupTransactionsByDay(input.txs || []), [input.txs]);
  const displayedTxIds = useMemo(() => (input.txs || []).map((tx: any) => String(tx.id)), [input.txs]);
  const allDisplayedSelected = displayedTxIds.length > 0 && displayedTxIds.every((id) => selectedTxIds.includes(id));
  const categoryOptions = useMemo(() => dedupeCategoryOptions(input.categoryOptions || []), [input.categoryOptions]);

  function toggleOne(txId: string) {
    setSelectedTxIds((current) => (current.includes(txId) ? current.filter((id) => id !== txId) : [...current, txId]));
  }

  function toggleAllDisplayed() {
    if (!displayedTxIds.length) return;
    if (allDisplayedSelected) {
      setSelectedTxIds((current) => current.filter((id) => !displayedTxIds.includes(id)));
      return;
    }

    setSelectedTxIds((current) => Array.from(new Set([...current, ...displayedTxIds])));
  }

  async function runBatch(intent: "delete" | "consolidate" | "unconsolidate") {
    if (!selectedTxIds.length || isWorking) return;

    if (intent === "delete") {
      const confirmed = window.confirm(`Excluir ${selectedTxIds.length} transação(ões) selecionada(s)?`);
      if (!confirmed) return;
    }

    setIsWorking(true);
    setMessage("");
    notifyGlobalLoading(true);

    try {
      const response = await fetch("/api/transactions/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent,
          tx_ids: selectedTxIds,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(String(data?.error || "Não foi possível processar o lote de transações."));
        return;
      }

      if (intent === "delete") setMessage(`${selectedTxIds.length} transação(ões) excluída(s).`);
      if (intent === "consolidate") setMessage(`${selectedTxIds.length} transação(ões) consolidada(s).`);
      if (intent === "unconsolidate") setMessage(`${selectedTxIds.length} transação(ões) marcadas como não consolidadas.`);

      setSelectedTxIds([]);
      router.refresh();
    } catch {
      setMessage("Erro inesperado ao processar transações em lote.");
    } finally {
      setIsWorking(false);
      notifyGlobalLoading(false);
    }
  }

  if (!input.txs.length) {
    return (
      <Card title="Transações">
        <div className="fg-empty">Nenhuma transação neste filtro.</div>
      </Card>
    );
  }

  return (
    <Card title="Transações" action={<span className="fg-chip">Clique na linha para editar</span>}>
      <div className="fg-legacy-transactions-actions">
        <button
          className="fg-btn-secondary fg-legacy-bulk-icon"
          type="button"
          onClick={toggleAllDisplayed}
          disabled={!displayedTxIds.length || isWorking}
          title="Selecionar todas as transações exibidas"
        >
          ☑
        </button>
        <button
          className="fg-btn-secondary fg-legacy-bulk-icon"
          type="button"
          onClick={() => runBatch("delete")}
          disabled={!selectedTxIds.length || isWorking}
          title="Excluir transações selecionadas"
        >
          ✖
        </button>
        <button
          className="fg-btn-secondary fg-legacy-bulk-icon is-green"
          type="button"
          onClick={() => runBatch("consolidate")}
          disabled={!selectedTxIds.length || isWorking}
          title="Consolidar transações selecionadas"
        >
          ✓
        </button>
        <button
          className="fg-btn-secondary fg-legacy-bulk-icon is-red"
          type="button"
          onClick={() => runBatch("unconsolidate")}
          disabled={!selectedTxIds.length || isWorking}
          title="Marcar como não consolidada"
        >
          ✓
        </button>
        <select className="fg-select" defaultValue="">
          <option value="">Alterar categoria</option>
          {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
        </select>
        <Link href="/exports" className="fg-btn-secondary">Exportar</Link>
      </div>

      {message ? <div className="fg-field-note">{message}</div> : null}

      <div className="fg-table-wrap">
        <table className="fg-table fg-legacy-transactions-table">
          <thead>
            <tr>
              <th></th>
              <th>Descrição</th>
              <th>Categoria</th>
              <th>Conta</th>
              <th>Valor (R$)</th>
              <th>C</th>
            </tr>
          </thead>
          <tbody>
            <tr className="fg-legacy-group-row">
              <td colSpan={6}>Todos</td>
            </tr>

            {grouped.map((group) => (
              <Fragment key={group.dayKey}>
                <tr className="fg-legacy-group-row">
                  <td colSpan={6}>{group.label}</td>
                </tr>

                {group.items.map((tx: any) => {
                  const txId = String(tx.id);
                  const account = accountById.get(String(tx.account_id || ""));
                  const bank = account ? bankById.get(String(account.bank_id || "")) : null;
                  const bankName = bank?.name || account?.institution_name || "Sem banco";
                  const selectedAccountId = String(tx.account_id || "") || String(input.accounts[0]?.id || "");
                  const selectedBankId = String(account?.bank_id || input.banks[0]?.id || "");
                  const currentCategory = String(tx.app_category || "Outros");
                  const txAmount = Number(tx.amount || 0);
                  const amountInputDefault = tx.type === "transfer"
                    ? (Number.isFinite(txAmount) ? txAmount.toFixed(2) : "0.00")
                    : Math.abs(Number.isFinite(txAmount) ? txAmount : 0).toFixed(2);
                  let txCategoryOptions = categoryOptions;
                  if (!txCategoryOptions.some((option) => option.value === currentCategory)) {
                    txCategoryOptions = [{ value: currentCategory, label: currentCategory, depth: 0 }, ...txCategoryOptions];
                  }
                  const editUrl = buildEditUrl(input.returnUrl, txId);
                  const isEditing = input.selectedEditTxId === txId;
                  const checked = selectedTxIds.includes(txId);

                  return (
                    <Fragment key={txId}>
                      <tr className={`fg-legacy-tx-row ${isEditing ? "is-active" : ""}`}>
                        <td>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleOne(txId)}
                            aria-label={`Selecionar transação ${tx.description || txId}`}
                          />
                        </td>
                        <td>
                          <Link href={editUrl} className="fg-legacy-desc-link">
                            {tx.description || "Sem descrição"}
                          </Link>
                        </td>
                        <td>
                          <Link href={editUrl} className="fg-legacy-cell-link">
                            {tx.app_category || "Outros"}
                          </Link>
                        </td>
                        <td>
                          <Link href={editUrl} className="fg-legacy-cell-link">
                            {bankName} {account?.name ? `- ${account.name}` : ""}
                          </Link>
                        </td>
                        <td className={Number(tx.amount) < 0 ? "fg-legacy-value-neg" : "fg-legacy-value-pos"}>
                          <Link href={editUrl} className="fg-legacy-cell-link fg-legacy-cell-link-right">
                            {amountOnly(tx.amount)}
                          </Link>
                        </td>
                        <td>
                          <Link href={editUrl} className="fg-legacy-cell-link fg-legacy-cell-link-center">
                            {tx.is_consolidated !== false ? "✓" : "○"}
                          </Link>
                        </td>
                      </tr>

                      {isEditing ? (
                        <tr>
                          <td colSpan={6}>
                            <form action="/api/categories/update" method="post" className="fg-legacy-inline-editor">
                              <input type="hidden" name="id" value={txId} />
                              <input type="hidden" name="return_url" value={input.returnUrl} />
                              <input type="hidden" name="bank_id" value={selectedBankId} />

                              <div className="fg-legacy-inline-top">
                                <input
                                  name="posted_at"
                                  type="date"
                                  required
                                  defaultValue={toInputDate(tx.posted_at)}
                                  className="fg-input"
                                />
                                <input
                                  name="description"
                                  required
                                  defaultValue={tx.description || ""}
                                  placeholder="Descrição"
                                  className="fg-input"
                                />
                                <select name="category" required defaultValue={currentCategory} className="fg-select">
                                  {txCategoryOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                                <select name="account_id" required defaultValue={selectedAccountId} className="fg-select">
                                  {input.accounts.map((item: any) => {
                                    const accountBank = bankById.get(String(item.bank_id || ""));
                                    const optionBankName = accountBank?.name || item.institution_name || "Sem banco";
                                    return <option key={item.id} value={item.id}>{optionBankName} - {item.name} ({accountTypeLabel(item.type)})</option>;
                                  })}
                                </select>
                                <input
                                  name="amount"
                                  type="number"
                                  step="0.01"
                                  required
                                  defaultValue={amountInputDefault}
                                  placeholder="Valor"
                                  className="fg-input"
                                />
                              </div>

                              <div className="fg-legacy-inline-middle">
                                <div className="fg-legacy-action-group">
                                  <label><input type="radio" name="action" value="Despesa" defaultChecked={actionFromType(tx.type) === "Despesa"} /> Despesa</label>
                                  <label><input type="radio" name="action" value="Receita" defaultChecked={actionFromType(tx.type) === "Receita"} /> Receita</label>
                                  <label><input type="radio" name="action" value="Transferência" defaultChecked={actionFromType(tx.type) === "Transferência"} /> Transferência</label>
                                </div>
                                <div className="fg-legacy-inline-right">
                                  <label className="fg-checkbox-row">
                                    <input name="is_consolidated" type="checkbox" defaultChecked={tx.is_consolidated !== false} />
                                    Consolidada
                                  </label>
                                  <label className="fg-checkbox-row fg-legacy-rule-check">
                                    <input type="checkbox" disabled />
                                    Criar regra
                                  </label>
                                  <span className="fg-legacy-mini-icon">?</span>
                                  <Link href={input.returnUrl} className="fg-legacy-mini-icon">✖</Link>
                                </div>
                              </div>

                              <div className="fg-legacy-inline-bottom">
                                <div className="fg-legacy-inline-col">
                                  <div className="fg-legacy-inline-label">Lembrete</div>
                                  <select name="reminder" defaultValue="none" className="fg-select">
                                    <option value="none">Nenhum</option>
                                    <option value="1d">1 dia antes</option>
                                    <option value="3d">3 dias antes</option>
                                    <option value="7d">7 dias antes</option>
                                  </select>
                                  <div className="fg-legacy-inline-label">Repetir transação</div>
                                  <div className="fg-legacy-repeat-options">
                                    <label><input type="radio" name="repeat_mode" value="none" defaultChecked /> Sem repetição</label>
                                    <label><input type="radio" name="repeat_mode" value="installment" /> Parcelamento</label>
                                    <label><input type="radio" name="repeat_mode" value="advanced" /> Avançado</label>
                                  </div>
                                  <button className="fg-btn-danger" name="intent" value="delete">Excluir</button>
                                </div>

                                <div className="fg-legacy-inline-col">
                                  <div className="fg-legacy-inline-label">Nota</div>
                                  <textarea name="note" className="fg-textarea fg-legacy-inline-note" placeholder="Observações da transação" />
                                  <div className="fg-legacy-inline-actions">
                                    <Link href={input.returnUrl} className="fg-btn-secondary">Cancelar</Link>
                                    <button className="fg-btn" name="intent" value="save">Salvar</button>
                                  </div>
                                </div>
                              </div>
                            </form>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function groupTransactionsByDay(txs: any[]) {
  const groups = new Map<string, any[]>();

  for (const tx of txs) {
    const dayKey = toInputDate(tx.posted_at);
    const list = groups.get(dayKey) || [];
    list.push(tx);
    groups.set(dayKey, list);
  }

  return Array.from(groups.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([dayKey, items]) => ({
      dayKey,
      label: formatLegacyDayLabel(dayKey),
      items,
    }));
}

function formatLegacyDayLabel(dayKey: string) {
  const date = new Date(`${dayKey}T12:00:00.000Z`);
  const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "UTC" }).format(date);
  const dateLabel = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(date);
  return `${dateLabel}, ${capitalize(weekday)}`;
}

function amountOnly(value: number | string | null | undefined) {
  const amount = Number(value || 0);
  return amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function actionFromType(type: string | null | undefined) {
  if (type === "credit") return "Receita";
  if (type === "transfer") return "Transferência";
  return "Despesa";
}

function toInputDate(input?: string | null) {
  if (!input) return new Date().toISOString().slice(0, 10);
  return new Date(input).toISOString().slice(0, 10);
}

function buildEditUrl(baseUrl: string, txId: string) {
  return appendQueryParam(baseUrl, "edit_tx", txId);
}

function appendQueryParam(baseUrl: string, key: string, value: string) {
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}${key}=${encodeURIComponent(value)}`;
}

function capitalize(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function dedupeCategoryOptions(options: CategorySelectOption[]) {
  const list: CategorySelectOption[] = [];
  const used = new Set<string>();

  for (const option of options || []) {
    const value = String(option?.value || "").trim();
    if (!value || used.has(value)) continue;

    used.add(value);
    list.push({
      value,
      label: String(option?.label || value),
      depth: Number(option?.depth || 0),
    });
  }

  return list;
}
