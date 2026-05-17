"use client";

import { useMemo, useState } from "react";

type BudgetSeed = {
  category: string;
  plannedAmount: number;
};

export function BudgetsPlannerPanel(input: {
  monthRef: string;
  availableCategories: string[];
  existingBudgets: BudgetSeed[];
  returnUrl: string;
}) {
  const seedAmountByCategory = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of input.existingBudgets || []) {
      const category = String(row.category || "").trim();
      if (!category) continue;
      map.set(category, toInputAmount(row.plannedAmount));
    }
    return map;
  }, [input.existingBudgets]);

  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    () => (input.existingBudgets || []).map((row) => String(row.category || "").trim()).filter(Boolean).sort(sortPtBr)
  );
  const [amountByCategory, setAmountByCategory] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const [category, amount] of seedAmountByCategory.entries()) initial[category] = amount;
    return initial;
  });
  const [quickCategory, setQuickCategory] = useState<string>("");
  const [newCategory, setNewCategory] = useState<string>("");

  const available = useMemo(
    () => Array.from(new Set((input.availableCategories || []).map((item) => String(item || "").trim()).filter(Boolean))).sort(sortPtBr),
    [input.availableCategories],
  );

  function ensureCategorySelected(categoryInput: string) {
    const category = String(categoryInput || "").trim();
    if (!category) return;

    setSelectedCategories((current) => {
      if (current.includes(category)) return [...current].sort(sortPtBr);
      return [...current, category].sort(sortPtBr);
    });

    setAmountByCategory((current) => {
      if (current[category] !== undefined) return current;
      return { ...current, [category]: seedAmountByCategory.get(category) || "0.00" };
    });
  }

  function toggleCategory(categoryInput: string, checked: boolean) {
    const category = String(categoryInput || "").trim();
    if (!category) return;

    if (checked) {
      ensureCategorySelected(category);
      return;
    }

    setSelectedCategories((current) => current.filter((item) => item !== category));
  }

  function removeSelectedCategory(categoryInput: string) {
    const category = String(categoryInput || "").trim();
    if (!category) return;
    setSelectedCategories((current) => current.filter((item) => item !== category));
  }

  function updateAmount(categoryInput: string, value: string) {
    const category = String(categoryInput || "").trim();
    if (!category) return;
    setAmountByCategory((current) => ({ ...current, [category]: value }));
  }

  function addQuickCategory() {
    if (!quickCategory) return;
    ensureCategorySelected(quickCategory);
    setQuickCategory("");
  }

  function addCustomCategory() {
    const normalized = String(newCategory || "").trim();
    if (!normalized) return;
    ensureCategorySelected(normalized);
    setNewCategory("");
  }

  return (
    <form action="/api/budgets/save" method="post" className="fg-form fg-budgets-form">
      <input type="hidden" name="month_ref" value={input.monthRef} />
      <input type="hidden" name="return_url" value={input.returnUrl} />

      <div className="fg-budgets-selector">
        <div className="fg-budgets-selector-head">
          <strong>Categorias do orcamento</strong>
          <span>{selectedCategories.length} selecionada(s)</span>
        </div>

        <div className="fg-budgets-selector-tools">
          <select
            className="fg-select"
            value={quickCategory}
            onChange={(event) => setQuickCategory(event.target.value)}
            aria-label="Selecionar categoria existente"
          >
            <option value="">Selecionar categoria</option>
            {available.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <button type="button" className="fg-btn-secondary" onClick={addQuickCategory}>
            Adicionar
          </button>
        </div>

        <div className="fg-budgets-selector-tools">
          <input
            className="fg-input"
            value={newCategory}
            onChange={(event) => setNewCategory(event.target.value)}
            placeholder="Nova categoria personalizada"
            aria-label="Nova categoria personalizada"
          />
          <button type="button" className="fg-btn-secondary" onClick={addCustomCategory}>
            Incluir categoria
          </button>
        </div>

        <div className="fg-budgets-categories-grid">
          {available.map((category) => {
            const checked = selectedCategories.includes(category);
            return (
              <label key={category} className={`fg-budgets-category-pill ${checked ? "is-active" : ""}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => toggleCategory(category, event.target.checked)}
                />
                <span>{category}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="fg-table-wrap">
        <table className="fg-table">
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Orcamento mensal (R$)</th>
              <th>Acao</th>
            </tr>
          </thead>
          <tbody>
            {selectedCategories.length ? (
              selectedCategories.map((category) => (
                <tr key={category}>
                  <td>
                    {category}
                    <input type="hidden" name="category" value={category} />
                  </td>
                  <td>
                    <input
                      name="planned_amount"
                      type="number"
                      step="0.01"
                      min="0"
                      className="fg-input"
                      value={amountByCategory[category] ?? "0.00"}
                      onChange={(event) => updateAmount(category, event.target.value)}
                    />
                  </td>
                  <td>
                    <button type="button" className="fg-btn-danger" onClick={() => removeSelectedCategory(category)}>
                      Remover
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3}>
                  Selecione categorias para criar orcamentos neste mes. Se salvar vazio, o mes fica sem categorias orcadas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="fg-budgets-actions">
        <button className="fg-btn">Salvar orcamento do mes</button>
      </div>
    </form>
  );
}

function toInputAmount(value: number) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return "0.00";
  return amount.toFixed(2);
}

function sortPtBr(a: string, b: string) {
  return a.localeCompare(b, "pt-BR");
}
