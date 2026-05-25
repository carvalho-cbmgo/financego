"use client";

import Link from "next/link";
import { Fragment, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { PreviousBalanceToggle } from "@/components/previous-balance-toggle";
import { accountTypeLabel } from "@/lib/accounts";
import { notifyGlobalLoading } from "@/components/global-loading-overlay";

type CategorySelectOption = {
  value: string;
  label: string;
  depth?: number;
};

type RepeatMode = "none" | "installment" | "advanced";
type RepeatEvery = "week" | "month" | "year";

type RecurrenceInfo = {
  isRecurring: boolean;
  defaultMode: RepeatMode;
  repeatEvery: RepeatEvery;
  repeatForever: boolean;
  installmentCurrent: number;
  installmentTotal: number;
  totalAmountValue: string;
  badgeLabel: string;
};

type TxTypeFilters = {
  all: boolean;
  expense: boolean;
  income: boolean;
  transfer: boolean;
};

export function TransactionsTable(input: {
  txs: any[];
  banks: any[];
  accounts: any[];
  previousBalance: number;
  includePreviousBalance: boolean;
  categoryOptions: CategorySelectOption[];
  returnUrl: string;
  selectedEditTxId: string;
}) {
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);
  const [isWorking, setIsWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [bulkCategoryValue, setBulkCategoryValue] = useState("");
  const [pendingReclassifyCategory, setPendingReclassifyCategory] = useState("");
  const [showReclassifyDialog, setShowReclassifyDialog] = useState(false);
  const [consolidationOverrides, setConsolidationOverrides] = useState<Record<string, boolean>>({});
  const [typeFilters, setTypeFilters] = useState<TxTypeFilters>({
    all: true,
    expense: false,
    income: false,
    transfer: false,
  });

  const accountById = useMemo(
    () => new Map<string, any>((input.accounts || []).map((acc: any) => [String(acc.id), acc])),
    [input.accounts],
  );
  const bankById = useMemo(
    () => new Map<string, any>((input.banks || []).map((bank: any) => [String(bank.id), bank])),
    [input.banks],
  );

  const filteredTxs = useMemo(() => {
    const txs = input.txs || [];
    if (typeFilters.all) return txs;

    return txs.filter((tx: any) => {
      const txType = mapTransactionTypeToFilter(tx?.type);
      if (txType === "expense") return typeFilters.expense;
      if (txType === "income") return typeFilters.income;
      return typeFilters.transfer;
    });
  }, [input.txs, typeFilters]);
  const grouped = useMemo(() => groupTransactionsByDay(filteredTxs), [filteredTxs]);
  const displayedAmount = useMemo(
    () => filteredTxs.reduce((sum: number, tx: any) => sum + Number(tx.amount || 0), 0),
    [filteredTxs],
  );
  const baseBalance = input.includePreviousBalance ? Number(input.previousBalance || 0) : 0;
  const balanceBeforeDisplayed = baseBalance;
  const balanceWithDisplayed = baseBalance + displayedAmount;
  const displayedTxIds = useMemo(() => filteredTxs.map((tx: any) => String(tx.id)), [filteredTxs]);
  const allDisplayedSelected = displayedTxIds.length > 0 && displayedTxIds.every((id) => selectedTxIds.includes(id));
  const categoryOptions = useMemo(() => dedupeCategoryOptions(input.categoryOptions || []), [input.categoryOptions]);
  const selectedTxForEdit = useMemo(
    () => (input.txs || []).find((tx: any) => String(tx.id) === String(input.selectedEditTxId || "")) || null,
    [input.txs, input.selectedEditTxId],
  );

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

  function handleAllTypeFilterChange(checked: boolean) {
    if (!checked) return;

    setTypeFilters({
      all: true,
      expense: false,
      income: false,
      transfer: false,
    });
  }

  function handleSpecificTypeFilterChange(type: "expense" | "income" | "transfer", checked: boolean) {
    setTypeFilters((current) => {
      const next = {
        ...current,
        all: false,
        [type]: checked,
      };

      if (!next.expense && !next.income && !next.transfer) {
        return {
          all: true,
          expense: false,
          income: false,
          transfer: false,
        };
      }

      return next;
    });
  }

  async function runBatch(intent: "delete" | "consolidate" | "unconsolidate" | "reclassify", category = "") {
    if (!selectedTxIds.length || isWorking) return;

    if (intent === "delete") {
      const confirmed = window.confirm(`Excluir ${selectedTxIds.length} transação(ões) selecionada(s)?`);
      if (!confirmed) return;
    }

    if (intent === "reclassify" && !String(category || "").trim()) {
      setMessage("Selecione uma categoria para reclassificar.");
      return;
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
          category,
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
      if (intent === "reclassify") setMessage(`${selectedTxIds.length} transação(ões) reclassificada(s).`);

      setSelectedTxIds([]);
      router.refresh();
    } catch {
      setMessage("Erro inesperado ao processar transações em lote.");
    } finally {
      setIsWorking(false);
      notifyGlobalLoading(false);
    }
  }

  async function toggleConsolidation(txId: string, checked: boolean) {
    if (!txId || isWorking) return;

    const tx = (input.txs || []).find((item: any) => String(item.id) === txId);
    const previous = consolidationOverrides[txId] ?? (tx?.is_consolidated !== false);

    setConsolidationOverrides((current) => ({
      ...current,
      [txId]: checked,
    }));
    setIsWorking(true);
    setMessage("");
    notifyGlobalLoading(true);

    try {
      const response = await fetch("/api/transactions/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: checked ? "consolidate" : "unconsolidate",
          tx_ids: [txId],
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setConsolidationOverrides((current) => ({
          ...current,
          [txId]: previous,
        }));
        setMessage(String(data?.error || "Não foi possível alterar a consolidação da transação."));
        return;
      }

      setMessage(checked ? "Transação consolidada." : "Transação marcada como não consolidada.");
      router.refresh();
    } catch {
      setConsolidationOverrides((current) => ({
        ...current,
        [txId]: previous,
      }));
      setMessage("Erro inesperado ao alterar a consolidação da transação.");
    } finally {
      setIsWorking(false);
      notifyGlobalLoading(false);
    }
  }


  function startReclassifyFlow(nextCategory: string) {
    const value = String(nextCategory || "").trim();
    if (!value) return;

    if (!selectedTxIds.length) {
      setMessage("Selecione ao menos uma transação para reclassificar.");
      setBulkCategoryValue("");
      return;
    }

    setPendingReclassifyCategory(value);
    setShowReclassifyDialog(true);
  }

  async function confirmReclassify() {
    const categoryValue = String(pendingReclassifyCategory || "").trim();
    if (!categoryValue) {
      cancelReclassify();
      return;
    }

    setShowReclassifyDialog(false);
    await runBatch("reclassify", categoryValue);
    setPendingReclassifyCategory("");
    setBulkCategoryValue("");
  }

  function cancelReclassify() {
    setShowReclassifyDialog(false);
    setPendingReclassifyCategory("");
    setBulkCategoryValue("");
  }

  function getCategoryLabel(value: string) {
    const match = categoryOptions.find((option) => option.value === value);
    return match?.label || value;
  }

  function closeEditModal() {
    router.push(input.returnUrl);
  }

  if (!input.txs.length) {
    return (
      <Card title="Transações">
        <div className="fg-empty">Nenhuma transação neste filtro.</div>
      </Card>
    );
  }

  return (
    <Card title="Transações">
      <div className="fg-legacy-transactions-actions">
        <button
          className="fg-btn fg-legacy-add-btn"
          type="button"
          onClick={() => {
            setShowCreateForm(true);
            if (input.selectedEditTxId) router.push(input.returnUrl);
          }}
          title="Adicionar nova transação"
        >
          + Adicionar transação
        </button>
        <div className="fg-legacy-transactions-actions-right">
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
          className="fg-category-tool-btn is-delete fg-legacy-del-btn"
          type="button"
          onClick={() => runBatch("delete")}
          disabled={!selectedTxIds.length || isWorking}
          title="Excluir transações selecionadas"
        >
          DEL
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
        <select
          className="fg-select"
          value={bulkCategoryValue}
          onChange={(event) => {
            const nextValue = event.target.value;
            setBulkCategoryValue(nextValue);
            startReclassifyFlow(nextValue);
          }}
          disabled={isWorking}
        >
          <option value="">Alterar categoria</option>
          {categoryOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        </div>
      </div>

      {message ? <div className="fg-field-note">{message}</div> : null}
      {showReclassifyDialog ? (
        <div className="fg-legacy-confirm-backdrop" role="dialog" aria-modal="true" onClick={cancelReclassify}>
          <div className="fg-legacy-confirm-modal" onClick={(event) => event.stopPropagation()}>
            <div className="fg-card-title">Confirmar reclassificação</div>
            <p>
              Deseja reclassificar {selectedTxIds.length} transação(ões) para a categoria{" "}
              <strong>{getCategoryLabel(pendingReclassifyCategory)}</strong>?
            </p>
            <div className="fg-legacy-confirm-actions">
              <button type="button" className="fg-btn" onClick={confirmReclassify}>
                Confirmar
              </button>
              <button type="button" className="fg-btn-secondary" onClick={cancelReclassify}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {showCreateForm ? (
        <TransactionFocusModal title="Adicionar transação" onClose={() => setShowCreateForm(false)}>
          <CreateTransactionInline
            accounts={input.accounts}
            bankById={bankById}
            categoryOptions={categoryOptions}
            returnUrl={input.returnUrl}
            onCancel={() => setShowCreateForm(false)}
          />
        </TransactionFocusModal>
      ) : null}
      {selectedTxForEdit ? (
        <TransactionFocusModal title="Editar transação" onClose={closeEditModal}>
          <EditTransactionFocus
            tx={selectedTxForEdit}
            accounts={input.accounts}
            bankById={bankById}
            categoryOptions={categoryOptions}
            returnUrl={input.returnUrl}
          />
        </TransactionFocusModal>
      ) : null}

      <div className="fg-table-wrap">
        <table className="fg-table fg-legacy-transactions-table">
          <thead>
            <tr className="fg-legacy-balance-head-row">
              <th colSpan={6}>
                <div className="fg-legacy-balance-head-top">
                  <div className="fg-legacy-type-filters" role="group" aria-label="Filtrar transações por ação">
                    <label className="fg-checkbox-row">
                      <input
                        type="checkbox"
                        checked={typeFilters.all}
                        onChange={(event) => handleAllTypeFilterChange(event.target.checked)}
                      />
                      Todos
                    </label>
                    <label className="fg-checkbox-row">
                      <input
                        type="checkbox"
                        checked={typeFilters.expense}
                        onChange={(event) => handleSpecificTypeFilterChange("expense", event.target.checked)}
                      />
                      Despesas
                    </label>
                    <label className="fg-checkbox-row">
                      <input
                        type="checkbox"
                        checked={typeFilters.income}
                        onChange={(event) => handleSpecificTypeFilterChange("income", event.target.checked)}
                      />
                      Receitas
                    </label>
                    <label className="fg-checkbox-row">
                      <input
                        type="checkbox"
                        checked={typeFilters.transfer}
                        onChange={(event) => handleSpecificTypeFilterChange("transfer", event.target.checked)}
                      />
                      Transferências
                    </label>
                  </div>
                  <div className="fg-legacy-prev-balance-toggle">
                    <PreviousBalanceToggle checked={input.includePreviousBalance} label="Incluir saldo anterior" />
                  </div>
                </div>
                <div className="fg-legacy-balance-head-value">
                  Saldo sem as transações exibidas: <strong>{brlCompact(balanceBeforeDisplayed)}</strong>
                </div>
              </th>
            </tr>
            <tr>
              <th className="fg-legacy-col-select"></th>
              <th className="fg-legacy-col-desc">Descrição</th>
              <th className="fg-legacy-col-category">Categoria</th>
              <th className="fg-legacy-col-account">Conta</th>
              <th className="fg-legacy-col-value">Valor (R$)</th>
              <th className="fg-legacy-col-status">C</th>
            </tr>
          </thead>
          <tbody>
            {!grouped.length ? (
              <tr>
                <td colSpan={6} className="fg-legacy-empty-cell">
                  Nenhuma transação para os filtros selecionados.
                </td>
              </tr>
            ) : grouped.map((group) => (
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
                  const currentNote = extractRawNote(tx.raw);
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
                  const isConsolidated = consolidationOverrides[txId] ?? (tx.is_consolidated !== false);
                  const isUnconsolidated = !isConsolidated;
                  const recurrenceInfo = getRecurrenceInfo(tx);

                  return (
                    <Fragment key={txId}>
                      <tr className={`fg-legacy-tx-row ${isEditing ? "is-active" : ""} ${isUnconsolidated ? "is-unconsolidated" : ""}`}>
                        <td className="fg-legacy-col-select">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleOne(txId)}
                            aria-label={`Selecionar transação ${tx.description || txId}`}
                          />
                        </td>
                        <td className="fg-legacy-col-desc">
                          <Link href={editUrl} className="fg-legacy-desc-link">
                            <span className="fg-legacy-desc-main">{tx.description || "Sem descrição"}</span>
                            {recurrenceInfo.isRecurring ? (
                              <span className="fg-chip fg-chip-recurring">{recurrenceInfo.badgeLabel}</span>
                            ) : null}
                          </Link>
                        </td>
                        <td className="fg-legacy-col-category">
                          <Link href={editUrl} className="fg-legacy-cell-link">
                            {tx.app_category || "Outros"}
                          </Link>
                        </td>
                        <td className="fg-legacy-col-account">
                          <Link href={editUrl} className="fg-legacy-cell-link">
                            {bankName} {account?.name ? `- ${account.name}` : ""}
                          </Link>
                        </td>
                        <td className={`fg-legacy-col-value ${Number(tx.amount) < 0 ? "fg-legacy-value-neg" : "fg-legacy-value-pos"}`}>
                          <Link href={editUrl} className="fg-legacy-cell-link fg-legacy-cell-link-right">
                            {amountOnly(tx.amount)}
                          </Link>
                        </td>
                        <td className="fg-legacy-col-status">
                          <input
                            type="checkbox"
                            className="fg-legacy-status-check"
                            checked={isConsolidated}
                            disabled={isWorking}
                            aria-label={`Marcar transação ${tx.description || txId} como consolidada`}
                            onChange={(event) => toggleConsolidation(txId, event.target.checked)}
                          />
                        </td>
                      </tr>

                      {false ? (
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
                                    return (
                                      <option key={item.id} value={item.id}>
                                        {optionBankName} - {item.name} ({accountTypeLabel(item.type)})
                                      </option>
                                    );
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
                                  <label><input type="radio" name="action" value="Transferencia" defaultChecked={actionFromType(tx.type) === "Transferencia"} /> Transferência</label>
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
                                  <Link href={input.returnUrl} className="fg-legacy-mini-icon">×</Link>
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
                                  <RecurringControls tx={tx} />
                                  <div className="fg-legacy-inline-label">Escopo ao excluir</div>
                                  <select
                                    name="delete_scope"
                                    defaultValue="single"
                                    className="fg-select"
                                    disabled={!recurrenceInfo.isRecurring}
                                  >
                                    <option value="single">Somente esta transação</option>
                                    <option value="up_to_current">Esta e anteriores vinculadas</option>
                                    <option value="from_current">Esta e posteriores vinculadas</option>
                                  </select>
                                  <button className="fg-btn-danger" name="intent" value="delete">Excluir</button>
                                </div>

                                <div className="fg-legacy-inline-col">
                                  <div className="fg-legacy-inline-label">Nota</div>
                                  <textarea
                                    name="note"
                                    className="fg-textarea fg-legacy-inline-note"
                                    defaultValue={currentNote}
                                    placeholder="Observações da transação"
                                  />
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
            <tr className="fg-legacy-balance-foot-row">
              <td colSpan={6}>
                Saldo com as transações exibidas: <strong>{brlCompact(balanceWithDisplayed)}</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function TransactionFocusModal(input: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fg-transaction-focus-backdrop" role="dialog" aria-modal="true" aria-label={input.title}>
      <div className="fg-transaction-focus-panel">
        <div className="fg-transaction-focus-head">
          <div>
            <div className="fg-transaction-focus-kicker">Finance GO</div>
            <h2>{input.title}</h2>
          </div>
          <button type="button" className="fg-transaction-focus-close" onClick={input.onClose} aria-label="Cancelar operação">
            ×
          </button>
        </div>
        {input.children}
      </div>
    </div>
  );
}

function CreateTransactionInline(input: {
  accounts: any[];
  bankById: Map<string, any>;
  categoryOptions: CategorySelectOption[];
  returnUrl: string;
  onCancel: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amountInput, setAmountInput] = useState("");
  const [action, setAction] = useState<"Despesa" | "Receita" | "Transferencia">("Despesa");
  const defaultAccountId = String(input.accounts?.[0]?.id || "");
  const defaultDestinationAccountId = String(input.accounts?.find((account: any) => String(account.id) !== defaultAccountId)?.id || "");
  const safeCategoryOptions = input.categoryOptions?.length
    ? input.categoryOptions
    : [{ value: "Outros", label: "Outros", depth: 0 }];

  if (!input.accounts?.length) {
    return <div className="fg-empty">Cadastre uma conta antes de adicionar transações.</div>;
  }

  return (
    <form
      action="/api/transactions/save"
      method="post"
      className="fg-legacy-create-form"
      onSubmit={() => {
        setIsSubmitting(true);
        notifyGlobalLoading(true);
      }}
    >
      <input type="hidden" name="return_url" value={input.returnUrl} />
      {action === "Transferencia" ? <input type="hidden" name="category" value="Transferências" /> : null}

      <div className="fg-legacy-create-action-row">
        <label className="fg-legacy-create-action-pill">
          <input
            type="radio"
            name="action"
            value="Despesa"
            checked={action === "Despesa"}
            onChange={() => setAction("Despesa")}
          />
          Despesa
        </label>
        <label className="fg-legacy-create-action-pill">
          <input
            type="radio"
            name="action"
            value="Receita"
            checked={action === "Receita"}
            onChange={() => setAction("Receita")}
          />
          Receita
        </label>
        <label className="fg-legacy-create-action-pill">
          <input
            type="radio"
            name="action"
            value="Transferencia"
            checked={action === "Transferencia"}
            onChange={() => setAction("Transferencia")}
          />
          Transferência
        </label>
      </div>

      {action === "Transferencia" ? (
        <div className="fg-transfer-form-grid">
          <label className="fg-field-label">
            Data
            <input
              name="posted_at"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
              className="fg-input"
            />
          </label>
          <label className="fg-field-label">
            Descrição
            <input name="description" required placeholder="Transferência entre contas" className="fg-input" />
          </label>
          <label className="fg-field-label">
            Valor
            <input
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="Valor"
              className="fg-input"
              value={amountInput}
              onChange={(event) => setAmountInput(event.target.value)}
            />
          </label>
          <label className="fg-field-label">
            Conta de Origem
            <select name="account_id" required defaultValue={defaultAccountId} className="fg-select">
              {input.accounts.map((account: any) => (
                <AccountOption key={account.id} account={account} bankById={input.bankById} />
              ))}
            </select>
          </label>
          <label className="fg-field-label">
            Conta de Destino
            <select name="transfer_destination_account_id" required defaultValue={defaultDestinationAccountId} className="fg-select">
              {input.accounts.map((account: any) => (
                <AccountOption key={account.id} account={account} bankById={input.bankById} />
              ))}
            </select>
          </label>
          <label className="fg-checkbox-row fg-legacy-create-check">
            <input name="is_consolidated" type="checkbox" defaultChecked />
            Consolidada
          </label>
        </div>
      ) : (
        <>
          <div className="fg-legacy-create-fields-row">
            <input
              name="posted_at"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
              className="fg-input fg-legacy-create-date"
            />

            <input name="description" required placeholder="Descrição da transação" className="fg-input fg-legacy-create-desc" />

            <select name="account_id" required defaultValue={defaultAccountId} className="fg-select fg-legacy-create-account">
              {input.accounts.map((account: any) => (
                <AccountOption key={account.id} account={account} bankById={input.bankById} />
              ))}
            </select>

            <select name="category" defaultValue="Outros" className="fg-select fg-legacy-create-category">
              {safeCategoryOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            <input
              name="amount"
              type="number"
              step="0.01"
              required
              placeholder="Valor"
              className="fg-input fg-legacy-create-amount"
              value={amountInput}
              onChange={(event) => setAmountInput(event.target.value)}
            />

            <label className="fg-checkbox-row fg-legacy-create-check">
              <input name="is_consolidated" type="checkbox" defaultChecked />
              Consolidada
            </label>
          </div>

          <RecurringCreateControls amountInput={amountInput} />
        </>
      )}

      <label className="fg-field-label fg-legacy-create-note-wrap">
        Observações
        <textarea
          name="note"
          className="fg-textarea fg-legacy-create-note"
          placeholder="Registre detalhes importantes desta transação"
        />
      </label>

      <div className="fg-legacy-create-actions">
        <button className="fg-btn fg-legacy-create-save" disabled={isSubmitting}>Salvar</button>
        <button
          type="button"
          className="fg-btn-danger fg-legacy-create-cancel"
          onClick={input.onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function AccountOption(input: { account: any; bankById: Map<string, any> }) {
  const accountBank = input.bankById.get(String(input.account.bank_id || ""));
  const optionBankName = accountBank?.name || input.account.institution_name || "Sem banco";

  return (
    <option value={input.account.id}>
      {optionBankName} - {input.account.name} ({accountTypeLabel(input.account.type)})
    </option>
  );
}
function EditTransactionFocus(input: {
  tx: any;
  accounts: any[];
  bankById: Map<string, any>;
  categoryOptions: CategorySelectOption[];
  returnUrl: string;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initialAction = actionFromType(input.tx?.type);
  const [action, setAction] = useState<"Despesa" | "Receita" | "Transferencia">(
    initialAction === "Receita" ? "Receita" : initialAction === "Transferencia" ? "Transferencia" : "Despesa",
  );
  const txAmount = Number(input.tx?.amount || 0);
  const transferMeta = extractRawTransfer(input.tx?.raw);
  const currentAccountId = String(input.tx?.account_id || input.accounts?.[0]?.id || "");
  const inferredOriginId = String(
    transferMeta?.originAccountId ||
    (txAmount < 0 ? currentAccountId : input.accounts.find((account: any) => String(account.id) !== currentAccountId)?.id || currentAccountId)
  );
  const inferredDestinationId = String(
    transferMeta?.destinationAccountId ||
    (txAmount > 0 ? currentAccountId : input.accounts.find((account: any) => String(account.id) !== inferredOriginId)?.id || "")
  );
  const [amountInput, setAmountInput] = useState(
    action === "Transferencia"
      ? Math.abs(txAmount).toFixed(2)
      : Math.abs(Number.isFinite(txAmount) ? txAmount : 0).toFixed(2),
  );
  const currentCategory = String(input.tx?.app_category || "Outros");
  const currentNote = extractRawNote(input.tx?.raw);
  const selectedAccount = input.accounts.find((account: any) => String(account.id) === currentAccountId);
  const selectedBankId = String(selectedAccount?.bank_id || "");
  let safeCategoryOptions = input.categoryOptions?.length
    ? input.categoryOptions
    : [{ value: "Outros", label: "Outros", depth: 0 }];

  if (!safeCategoryOptions.some((option) => option.value === currentCategory)) {
    safeCategoryOptions = [{ value: currentCategory, label: currentCategory, depth: 0 }, ...safeCategoryOptions];
  }

  return (
    <form
      action="/api/categories/update"
      method="post"
      className="fg-legacy-create-form"
      onSubmit={() => {
        setIsSubmitting(true);
        notifyGlobalLoading(true);
      }}
    >
      <input type="hidden" name="id" value={String(input.tx?.id || "")} />
      <input type="hidden" name="return_url" value={input.returnUrl} />
      <input type="hidden" name="bank_id" value={selectedBankId} />
      {action === "Transferencia" ? <input type="hidden" name="category" value="Transferências" /> : null}

      <div className="fg-legacy-create-action-row">
        <label className="fg-legacy-create-action-pill">
          <input
            type="radio"
            name="action"
            value="Despesa"
            checked={action === "Despesa"}
            onChange={() => setAction("Despesa")}
          />
          Despesa
        </label>
        <label className="fg-legacy-create-action-pill">
          <input
            type="radio"
            name="action"
            value="Receita"
            checked={action === "Receita"}
            onChange={() => setAction("Receita")}
          />
          Receita
        </label>
        <label className="fg-legacy-create-action-pill">
          <input
            type="radio"
            name="action"
            value="Transferencia"
            checked={action === "Transferencia"}
            onChange={() => setAction("Transferencia")}
          />
          Transferência
        </label>
      </div>

      {action === "Transferencia" ? (
        <div className="fg-transfer-form-grid">
          <label className="fg-field-label">
            Data
            <input name="posted_at" type="date" required defaultValue={toInputDate(input.tx?.posted_at)} className="fg-input" />
          </label>
          <label className="fg-field-label">
            Descrição
            <input name="description" required defaultValue={input.tx?.description || ""} className="fg-input" />
          </label>
          <label className="fg-field-label">
            Valor
            <input
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              className="fg-input"
              value={amountInput}
              onChange={(event) => setAmountInput(event.target.value)}
            />
          </label>
          <label className="fg-field-label">
            Conta de Origem
            <select name="account_id" required defaultValue={inferredOriginId} className="fg-select">
              {input.accounts.map((account: any) => (
                <AccountOption key={account.id} account={account} bankById={input.bankById} />
              ))}
            </select>
          </label>
          <label className="fg-field-label">
            Conta de Destino
            <select name="transfer_destination_account_id" required defaultValue={inferredDestinationId} className="fg-select">
              {input.accounts.map((account: any) => (
                <AccountOption key={account.id} account={account} bankById={input.bankById} />
              ))}
            </select>
          </label>
          <label className="fg-checkbox-row fg-legacy-create-check">
            <input name="is_consolidated" type="checkbox" defaultChecked={input.tx?.is_consolidated !== false} />
            Consolidada
          </label>
        </div>
      ) : (
        <>
          <div className="fg-legacy-create-fields-row">
            <input name="posted_at" type="date" required defaultValue={toInputDate(input.tx?.posted_at)} className="fg-input fg-legacy-create-date" />
            <input name="description" required defaultValue={input.tx?.description || ""} placeholder="Descrição" className="fg-input fg-legacy-create-desc" />
            <select name="account_id" required defaultValue={currentAccountId} className="fg-select fg-legacy-create-account">
              {input.accounts.map((account: any) => (
                <AccountOption key={account.id} account={account} bankById={input.bankById} />
              ))}
            </select>
            <select name="category" required defaultValue={currentCategory} className="fg-select fg-legacy-create-category">
              {safeCategoryOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <input
              name="amount"
              type="number"
              step="0.01"
              required
              placeholder="Valor"
              className="fg-input fg-legacy-create-amount"
              value={amountInput}
              onChange={(event) => setAmountInput(event.target.value)}
            />
            <label className="fg-checkbox-row fg-legacy-create-check">
              <input name="is_consolidated" type="checkbox" defaultChecked={input.tx?.is_consolidated !== false} />
              Consolidada
            </label>
          </div>
          <RecurringControls tx={input.tx} />
        </>
      )}

      <label className="fg-field-label fg-legacy-create-note-wrap">
        Observações
        <textarea
          name="note"
          className="fg-textarea fg-legacy-create-note"
          defaultValue={currentNote}
          placeholder="Observações da transação"
        />
      </label>

      <div className="fg-legacy-create-actions">
        <button className="fg-btn-danger" name="intent" value="delete" disabled={isSubmitting}>Excluir</button>
        <Link href={input.returnUrl} className="fg-btn-secondary">Cancelar</Link>
        <button className="fg-btn" name="intent" value="save" disabled={isSubmitting}>Salvar</button>
      </div>
    </form>
  );
}
function RecurringCreateControls({ amountInput }: { amountInput: string }) {
  const [mode, setMode] = useState<RepeatMode>("none");
  const [repeatEvery, setRepeatEvery] = useState<RepeatEvery>("month");
  const [repeatForever, setRepeatForever] = useState<boolean>(false);
  const [installmentCurrent, setInstallmentCurrent] = useState<number>(1);
  const [installmentTotal, setInstallmentTotal] = useState<number>(1);

  const showInstallment = mode === "installment";
  const showAdvanced = mode === "advanced";
  const installmentAmount = parsePositiveDecimal(amountInput);
  const remainingInstallments = Math.max(1, installmentTotal - installmentCurrent + 1);
  const calculatedTotalAmount = (installmentAmount * remainingInstallments).toFixed(2);

  function updateCurrent(value: string) {
    const nextCurrent = Math.max(1, Math.trunc(Number(value) || 1));
    setInstallmentCurrent(nextCurrent);
    setInstallmentTotal((current) => Math.max(nextCurrent, Math.trunc(Number(current) || nextCurrent)));
  }

  function updateTotal(value: string) {
    const nextTotal = Math.max(installmentCurrent, Math.trunc(Number(value) || installmentCurrent));
    setInstallmentTotal(nextTotal);
  }

  return (
    <div className="fg-legacy-create-repeat-wrap">
      <div className="fg-legacy-inline-label">Repetir transação</div>
      <div className="fg-legacy-repeat-options">
        <label>
          <input type="radio" name="repeat_mode" value="none" checked={mode === "none"} onChange={() => setMode("none")} />
          Sem repeticao
        </label>
        <label>
          <input
            type="radio"
            name="repeat_mode"
            value="installment"
            checked={mode === "installment"}
            onChange={() => setMode("installment")}
          />
          Parcelamento (mensal)
        </label>
        <label>
          <input
            type="radio"
            name="repeat_mode"
            value="advanced"
            checked={mode === "advanced"}
            onChange={() => setMode("advanced")}
          />
          Avancado
        </label>
      </div>

      {showInstallment ? (
        <div className="fg-legacy-repeat-grid">
          <label className="fg-field-label">
            N. da parcela atual
            <input
              type="number"
              name="installment_current"
              min={1}
              required
              className="fg-input"
              value={installmentCurrent}
              onChange={(event) => updateCurrent(event.target.value)}
            />
          </label>
          <label className="fg-field-label">
            Quantidade total de parcelas
            <input
              type="number"
              name="installment_total"
              min={installmentCurrent}
              required
              className="fg-input"
              value={installmentTotal}
              onChange={(event) => updateTotal(event.target.value)}
            />
          </label>
          <label className="fg-field-label">
            R$ Total
            <input
              type="text"
              className="fg-input"
              value={brlCompact(calculatedTotalAmount)}
              readOnly
              aria-readonly="true"
            />
          </label>
          <input type="hidden" name="installment_total_amount" value={calculatedTotalAmount} />
          <div className="fg-field-note">
            Parcelas restantes: {remainingInstallments}. Total calculado automaticamente.
          </div>
          <input type="hidden" name="repeat_every" value="month" />
        </div>
      ) : null}

      {showAdvanced ? (
        <div className="fg-legacy-repeat-grid">
          <label className="fg-field-label">
            Repetir a cada
            <select
              name="repeat_every"
              className="fg-select"
              value={repeatEvery}
              onChange={(event) => setRepeatEvery(parseRepeatEvery(event.target.value))}
            >
              <option value="week">Semana</option>
              <option value="month">Mês</option>
              <option value="year">Ano</option>
            </select>
          </label>

          <label className="fg-checkbox-row fg-legacy-repeat-check">
            <input
              type="checkbox"
              name="repeat_forever"
              checked={repeatForever}
              onChange={(event) => setRepeatForever(event.target.checked)}
            />
            Repetir infinitamente
          </label>

          <label className="fg-field-label">
            N. da parcela atual
            <input
              type="number"
              name="installment_current"
              min={1}
              required
              className="fg-input"
              value={installmentCurrent}
              onChange={(event) => updateCurrent(event.target.value)}
            />
          </label>

          {!repeatForever ? (
            <label className="fg-field-label">
              Quantidade total de parcelas
              <input
                type="number"
                name="installment_total"
                min={installmentCurrent}
                className="fg-input"
                value={installmentTotal}
                onChange={(event) => updateTotal(event.target.value)}
              />
            </label>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function RecurringControls({ tx }: { tx: any }) {
  const recurrenceInfo = useMemo(() => getRecurrenceInfo(tx), [tx]);
  const [mode, setMode] = useState<RepeatMode>(recurrenceInfo.defaultMode);
  const [repeatEvery, setRepeatEvery] = useState<RepeatEvery>(recurrenceInfo.repeatEvery);
  const [repeatForever, setRepeatForever] = useState<boolean>(recurrenceInfo.repeatForever);
  const [installmentCurrent, setInstallmentCurrent] = useState<number>(recurrenceInfo.installmentCurrent);
  const [installmentTotal, setInstallmentTotal] = useState<number>(recurrenceInfo.installmentTotal);
  const [installmentTotalAmount, setInstallmentTotalAmount] = useState<string>(recurrenceInfo.totalAmountValue);

  const showInstallment = mode === "installment";
  const showAdvanced = mode === "advanced";

  function updateCurrent(value: string) {
    const nextCurrent = Math.max(1, Math.trunc(Number(value) || 1));
    setInstallmentCurrent(nextCurrent);
    setInstallmentTotal((current) => Math.max(nextCurrent, Math.trunc(Number(current) || nextCurrent)));
  }

  function updateTotal(value: string) {
    const nextTotal = Math.max(installmentCurrent, Math.trunc(Number(value) || installmentCurrent));
    setInstallmentTotal(nextTotal);
  }

  return (
    <>
      <div className="fg-legacy-inline-label">Repetir transação</div>
      <div className="fg-legacy-repeat-options">
        <label>
          <input type="radio" name="repeat_mode" value="none" checked={mode === "none"} onChange={() => setMode("none")} />
          Sem repetição
        </label>
        <label>
          <input
            type="radio"
            name="repeat_mode"
            value="installment"
            checked={mode === "installment"}
            onChange={() => setMode("installment")}
          />
          Parcelamento (mensal)
        </label>
        <label>
          <input
            type="radio"
            name="repeat_mode"
            value="advanced"
            checked={mode === "advanced"}
            onChange={() => setMode("advanced")}
          />
          Avançado
        </label>
      </div>

      {showInstallment ? (
        <div className="fg-legacy-repeat-grid">
          <label className="fg-field-label">
            Nº da parcela atual
            <input
              type="number"
              name="installment_current"
              min={1}
              required
              className="fg-input"
              value={installmentCurrent}
              onChange={(event) => updateCurrent(event.target.value)}
            />
          </label>
          <label className="fg-field-label">
            Quantidade total de parcelas
            <input
              type="number"
              name="installment_total"
              min={installmentCurrent}
              required
              className="fg-input"
              value={installmentTotal}
              onChange={(event) => updateTotal(event.target.value)}
            />
          </label>
          <label className="fg-field-label">
            R$ Total
            <input
              type="number"
              name="installment_total_amount"
              min="0.01"
              step="0.01"
              className="fg-input"
              value={installmentTotalAmount}
              onChange={(event) => setInstallmentTotalAmount(event.target.value)}
            />
          </label>
          <input type="hidden" name="repeat_every" value="month" />
        </div>
      ) : null}

      {showAdvanced ? (
        <div className="fg-legacy-repeat-grid">
          <label className="fg-field-label">
            Repetir a cada
            <select
              name="repeat_every"
              className="fg-select"
              value={repeatEvery}
              onChange={(event) => setRepeatEvery(parseRepeatEvery(event.target.value))}
            >
              <option value="week">Semana</option>
              <option value="month">Mês</option>
              <option value="year">Ano</option>
            </select>
          </label>

          <label className="fg-checkbox-row fg-legacy-repeat-check">
            <input
              type="checkbox"
              name="repeat_forever"
              checked={repeatForever}
              onChange={(event) => setRepeatForever(event.target.checked)}
            />
            Repetir infinitamente
          </label>

          <label className="fg-field-label">
            Nº da parcela atual
            <input
              type="number"
              name="installment_current"
              min={1}
              required
              className="fg-input"
              value={installmentCurrent}
              onChange={(event) => updateCurrent(event.target.value)}
            />
          </label>

          {!repeatForever ? (
            <label className="fg-field-label">
              Quantidade total de parcelas
              <input
                type="number"
                name="installment_total"
                min={installmentCurrent}
                className="fg-input"
                value={installmentTotal}
                onChange={(event) => updateTotal(event.target.value)}
              />
            </label>
          ) : null}

          <div className="fg-field-note">
            As recorrentes serão vinculadas e exibidas com indicador visual na lista.
          </div>
        </div>
      ) : null}
    </>
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

function brlCompact(value: number | string | null | undefined) {
  const amount = Number(value || 0);
  return amount.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function actionFromType(type: string | null | undefined) {
  if (type === "credit") return "Receita";
  if (type === "transfer") return "Transferencia";
  return "Despesa";
}

function mapTransactionTypeToFilter(type: string | null | undefined) {
  const normalized = String(type || "").trim().toLowerCase();

  if (normalized === "credit" || normalized === "income" || normalized === "receita") {
    return "income" as const;
  }

  if (normalized === "transfer" || normalized === "transferencia" || normalized === "transferência") {
    return "transfer" as const;
  }

  return "expense" as const;
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

function parseRepeatEvery(input: string): RepeatEvery {
  const value = String(input || "").trim().toLowerCase();
  if (value === "week" || value === "semana") return "week";
  if (value === "year" || value === "ano") return "year";
  return "month";
}

function parsePositiveDecimal(input: string) {
  const normalized = String(input || "").trim().replace(",", ".");
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.abs(value);
}

function formatRepeatEveryLabel(value: RepeatEvery) {
  if (value === "week") return "Semanal";
  if (value === "year") return "Anual";
  return "Mensal";
}

function getRecurrenceInfo(tx: any): RecurrenceInfo {
  const rawRecurrence = extractRawRecurrence(tx?.raw);
  const metadataModeRaw = String(rawRecurrence?.mode || "").trim().toLowerCase();

  let defaultMode: RepeatMode = "none";
  if (metadataModeRaw === "installment") defaultMode = "installment";
  else if (metadataModeRaw === "advanced") defaultMode = "advanced";

  const installmentCurrent = Math.max(1, Number(tx?.installment_current || 1));
  const rawInstallmentTotal = Number(tx?.installment_total || 0);
  const inferredTotal = Number.isFinite(rawInstallmentTotal) && rawInstallmentTotal >= installmentCurrent
    ? rawInstallmentTotal
    : Math.max(installmentCurrent, 12);

  const hasGroup = Boolean(String(tx?.installment_group_key || "").trim());
  const metadataRepeatForever = Boolean(rawRecurrence?.repeatForever);
  const metadataRepeatEvery = parseRepeatEvery(String(rawRecurrence?.repeatEvery || "month"));

  const hasInstallmentNumbers = Boolean(tx?.installment_current) || Boolean(tx?.installment_total);
  const isRecurring = hasGroup || defaultMode !== "none" || hasInstallmentNumbers;

  if (defaultMode === "none" && isRecurring) {
    defaultMode = rawInstallmentTotal > 0 ? "installment" : "advanced";
  }

  const repeatForever = defaultMode === "advanced"
    ? (metadataRepeatForever || (!tx?.installment_total && hasGroup))
    : false;

  const repeatEvery = defaultMode === "advanced" ? metadataRepeatEvery : "month";

  let badgeLabel = "Recorrente";
  if (defaultMode === "installment") {
    badgeLabel = `Parcela ${installmentCurrent} de ${Math.max(installmentCurrent, rawInstallmentTotal || inferredTotal)}`;
  } else if (defaultMode === "advanced") {
    if (repeatForever) badgeLabel = `Recorrente ${installmentCurrent} - ${formatRepeatEveryLabel(repeatEvery)}`;
    else badgeLabel = `Recorrente ${installmentCurrent}/${Math.max(installmentCurrent, rawInstallmentTotal || inferredTotal)} - ${formatRepeatEveryLabel(repeatEvery)}`;
  }

  const amountAbs = Math.abs(Number(tx?.amount || 0));
  const totalAmountValue = (amountAbs * Math.max(1, inferredTotal)).toFixed(2);

  return {
    isRecurring,
    defaultMode,
    repeatEvery,
    repeatForever,
    installmentCurrent,
    installmentTotal: inferredTotal,
    totalAmountValue,
    badgeLabel,
  };
}

function extractRawRecurrence(raw: any) {
  if (!raw) return null;

  const payload = typeof raw === "string" ? safeJsonParse(raw) : raw;
  if (!payload || typeof payload !== "object") return null;

  const recurrence = (payload as any).recurrence;
  if (!recurrence || typeof recurrence !== "object") return null;

  return recurrence as Record<string, any>;
}

function extractRawNote(raw: any) {
  if (!raw) return "";

  const payload = typeof raw === "string" ? safeJsonParse(raw) : raw;
  if (!payload || typeof payload !== "object") return "";

  return String((payload as any).note || "").trim();
}

function extractRawTransfer(raw: any) {
  if (!raw) return null;

  const payload = typeof raw === "string" ? safeJsonParse(raw) : raw;
  if (!payload || typeof payload !== "object") return null;

  const transfer = (payload as any).transfer;
  if (!transfer || typeof transfer !== "object") return null;

  return {
    originAccountId: String((transfer as any).originAccountId || ""),
    destinationAccountId: String((transfer as any).destinationAccountId || ""),
    role: String((transfer as any).role || ""),
  };
}

function safeJsonParse(input: string) {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}
