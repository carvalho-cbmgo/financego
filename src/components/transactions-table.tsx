"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
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

export function TransactionsTable(input: {
  txs: any[];
  banks: any[];
  accounts: any[];
  categoryOptions: CategorySelectOption[];
  returnUrl: string;
  selectedEditTxId: string;
}) {
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
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
          className="fg-btn fg-legacy-add-btn"
          type="button"
          onClick={() => setShowCreateForm((current) => !current)}
          title="Adicionar nova transacao"
        >
          {showCreateForm ? "Fechar" : "+ Adicionar transacao"}
        </button>
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
        <select className="fg-select" defaultValue="">
          <option value="">Alterar categoria</option>
          {categoryOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <Link href="/exports" className="fg-btn-secondary">Exportar</Link>
      </div>

      {message ? <div className="fg-field-note">{message}</div> : null}
      {showCreateForm ? (
        <CreateTransactionInline
          accounts={input.accounts}
          bankById={bankById}
          categoryOptions={categoryOptions}
          returnUrl={input.returnUrl}
        />
      ) : null}

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
                  const recurrenceInfo = getRecurrenceInfo(tx);

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
                            <span className="fg-legacy-desc-main">{tx.description || "Sem descrição"}</span>
                            {recurrenceInfo.isRecurring ? (
                              <span className="fg-chip fg-chip-recurring">{recurrenceInfo.badgeLabel}</span>
                            ) : null}
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

function CreateTransactionInline(input: {
  accounts: any[];
  bankById: Map<string, any>;
  categoryOptions: CategorySelectOption[];
  returnUrl: string;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const defaultAccountId = String(input.accounts?.[0]?.id || "");
  const safeCategoryOptions = input.categoryOptions?.length
    ? input.categoryOptions
    : [{ value: "Outros", label: "Outros", depth: 0 }];

  if (!input.accounts?.length) {
    return <div className="fg-empty">Cadastre uma conta antes de adicionar transacoes.</div>;
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

      <div className="fg-grid-3">
        <select name="account_id" required defaultValue={defaultAccountId} className="fg-select">
          {input.accounts.map((account: any) => {
            const bank = input.bankById.get(String(account.bank_id || ""));
            const bankName = bank?.name || account.institution_name || "Sem banco";
            return (
              <option key={account.id} value={account.id}>
                {bankName} - {account.name} ({accountTypeLabel(account.type)})
              </option>
            );
          })}
        </select>

        <input name="description" required placeholder="Descricao" className="fg-input" />

        <input
          name="posted_at"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
          required
          className="fg-input"
        />
      </div>

      <div className="fg-grid-4">
        <input name="amount" type="number" step="0.01" required placeholder="Valor" className="fg-input" />

        <select name="action" defaultValue="Despesa" required className="fg-select">
          <option value="Receita">Receita</option>
          <option value="Despesa">Despesa</option>
          <option value="Transferencia">Transferencia</option>
        </select>

        <select name="category" defaultValue="Outros" className="fg-select">
          {safeCategoryOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        <label className="fg-checkbox-row fg-legacy-create-check">
          <input name="is_consolidated" type="checkbox" defaultChecked />
          Consolidada
        </label>
      </div>

      <div className="fg-legacy-create-actions">
        <button className="fg-btn" disabled={isSubmitting}>Salvar transacao</button>
      </div>
    </form>
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

          <label className="fg-field-label">
            Quantidade total de parcelas
            <input
              type="number"
              name="installment_total"
              min={installmentCurrent}
              className="fg-input"
              disabled={repeatForever}
              value={installmentTotal}
              onChange={(event) => updateTotal(event.target.value)}
            />
          </label>

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

function parseRepeatEvery(input: string): RepeatEvery {
  const value = String(input || "").trim().toLowerCase();
  if (value === "week" || value === "semana") return "week";
  if (value === "year" || value === "ano") return "year";
  return "month";
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
    if (repeatForever) badgeLabel = `Recorrente • ${formatRepeatEveryLabel(repeatEvery)}`;
    else badgeLabel = `Recorrente ${installmentCurrent}/${Math.max(installmentCurrent, rawInstallmentTotal || inferredTotal)} • ${formatRepeatEveryLabel(repeatEvery)}`;
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

function safeJsonParse(input: string) {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}
