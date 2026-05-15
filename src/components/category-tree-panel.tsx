"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { brl } from "@/lib/format";
import { notifyGlobalLoading } from "@/components/global-loading-overlay";
import type { CategoryGroupStats, CategoryLeafStats } from "@/lib/category-tree";

function normalizeValue(input?: string | null) {
  return (input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stableCsv(values: string[]) {
  return [...values].sort((a, b) => a.localeCompare(b, "pt-BR")).join("|");
}

function parseCsv(input: string) {
  return input
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function CategoryTreePanel(input: {
  groups: CategoryGroupStats[];
  selectedCategories: string[];
  selectedBankId: string;
  selectedAccountIds: string[];
  selectedAccountId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string[]>(input.selectedCategories);
  const [searchText, setSearchText] = useState("");
  const [message, setMessage] = useState("");
  const [savingCategory, setSavingCategory] = useState("");
  const [editingCategory, setEditingCategory] = useState("");
  const [editingValue, setEditingValue] = useState("");
  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() => {
    return Object.fromEntries(input.groups.map((group) => [group.name, true]));
  });

  const selectedSignature = useMemo(() => stableCsv(input.selectedCategories), [input.selectedCategories]);

  useEffect(() => {
    setSelected(input.selectedCategories);
  }, [selectedSignature, input.selectedCategories]);

  useEffect(() => {
    setOpenMap((current) => {
      const next = { ...current };
      for (const group of input.groups) {
        if (typeof next[group.name] !== "boolean") next[group.name] = true;
      }
      return next;
    });
  }, [input.groups]);

  const filteredGroups = useMemo(() => {
    const query = normalizeValue(searchText);
    if (!query) return input.groups;

    return input.groups
      .map((group) => {
        const groupMatches = normalizeValue(group.name).includes(query);
        const leaves = groupMatches
          ? group.leaves
          : group.leaves.filter((leaf) => normalizeValue(leaf.name).includes(query));

        return { ...group, leaves };
      })
      .filter((group) => group.leaves.length > 0);
  }, [input.groups, searchText]);

  const visibleLeaves = filteredGroups.flatMap((group) => group.leaves.map((leaf) => leaf.name));

  function navigateWith(nextSelected: string[]) {
    const params = new URLSearchParams(window.location.search);

    params.set("tab", "transactions");
    params.delete("edit_tx");
    params.delete("new_tx");
    params.delete("category");

    if (input.selectedBankId) params.set("bank_id", input.selectedBankId);
    else params.delete("bank_id");

    params.delete("account_id");
    if (input.selectedAccountIds.length) params.set("account_ids", input.selectedAccountIds.join(","));
    else if (input.selectedAccountId) params.set("account_id", input.selectedAccountId);
    else params.delete("account_ids");

    if (nextSelected.length) params.set("categories", nextSelected.join(","));
    else params.delete("categories");

    const nextHref = `/dashboard?${params.toString()}`;
    const currentHref = `${window.location.pathname}${window.location.search}`;
    if (nextHref === currentHref) return;

    notifyGlobalLoading(true);
    startTransition(() => {
      router.replace(nextHref, { scroll: false });
    });
  }

  function toggleLeaf(leafName: string) {
    const has = selected.includes(leafName);
    const next = has ? selected.filter((item) => item !== leafName) : [...selected, leafName];
    setSelected(next);
    navigateWith(next);
  }

  function toggleGroup(leaves: CategoryLeafStats[]) {
    const names = leaves.map((leaf) => leaf.name);
    const everySelected = names.every((name) => selected.includes(name));

    let next: string[];
    if (everySelected) {
      const set = new Set(names);
      next = selected.filter((name) => !set.has(name));
    } else {
      next = Array.from(new Set([...selected, ...names]));
    }

    setSelected(next);
    navigateWith(next);
  }

  function clearSelection() {
    setSelected([]);
    navigateWith([]);
  }

  function selectVisible() {
    const next = Array.from(new Set([...selected, ...visibleLeaves]));
    setSelected(next);
    navigateWith(next);
  }

  function toggleOpen(groupName: string) {
    setOpenMap((current) => ({ ...current, [groupName]: !current[groupName] }));
  }

  function openRename(leafName: string) {
    setEditingCategory(leafName);
    setEditingValue(leafName);
    setMessage("");
  }

  async function saveRename(oldCategory: string) {
    const nextCategory = editingValue.trim();

    if (!nextCategory) {
      setMessage("Informe um nome valido para categoria.");
      return;
    }

    if (nextCategory === oldCategory) {
      setEditingCategory("");
      setEditingValue("");
      return;
    }

    try {
      setSavingCategory(oldCategory);
      setMessage("");

      const response = await fetch("/api/categories/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          old_category: oldCategory,
          new_category: nextCategory,
          return_url: `${window.location.pathname}${window.location.search}`,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(String(payload?.error || "Nao foi possivel renomear categoria."));
        return;
      }

      const current = parseCsv(new URLSearchParams(window.location.search).get("categories") || "");

      if (current.includes(oldCategory)) {
        const patched = current.map((item) => (item === oldCategory ? nextCategory : item));
        navigateWith(Array.from(new Set(patched)));
      } else {
        notifyGlobalLoading(true);
        startTransition(() => {
          router.refresh();
        });
      }

      setEditingCategory("");
      setEditingValue("");
    } catch {
      setMessage("Erro inesperado ao renomear categoria.");
    } finally {
      setSavingCategory("");
    }
  }

  return (
    <div className="fg-category-tree-wrap">
      <div className="fg-category-tree-top">
        <div className="fg-legacy-inline-label">Busca rapida</div>
        <div className="fg-category-search-row">
          <input
            className="fg-input"
            placeholder="Texto da busca"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
          <button type="button" className="fg-btn-secondary" onClick={() => setSearchText(searchText)}>
            Buscar
          </button>
        </div>

        <div className="fg-category-tree-actions">
          <button type="button" className="fg-btn-secondary" onClick={selectVisible} disabled={isPending || !visibleLeaves.length}>
            Marcar visiveis
          </button>
          <button type="button" className="fg-btn-secondary" onClick={clearSelection} disabled={isPending || !selected.length}>
            Limpar filtro
          </button>
        </div>
      </div>

      {message ? <div className="fg-field-note">{message}</div> : null}

      <div className="fg-category-tree-list">
        {filteredGroups.map((group) => {
          const groupLeaves = group.leaves;
          const checkedCount = groupLeaves.filter((leaf) => selected.includes(leaf.name)).length;
          const allChecked = groupLeaves.length > 0 && checkedCount === groupLeaves.length;
          const partial = checkedCount > 0 && checkedCount < groupLeaves.length;

          return (
            <div key={group.name} className="fg-category-group">
              <div className="fg-category-group-head">
                <button type="button" className="fg-category-group-toggle" onClick={() => toggleOpen(group.name)}>
                  {openMap[group.name] ? "-" : "+"}
                </button>

                <label className="fg-category-group-label">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={() => toggleGroup(groupLeaves)}
                  />
                  <span>
                    {group.name}
                    {partial ? " (parcial)" : ""}
                  </span>
                </label>

                <span className="fg-category-group-count">{group.txCount}</span>
              </div>

              {openMap[group.name] ? (
                <div className="fg-category-leaf-list">
                  {groupLeaves.map((leaf) => {
                    const isEditing = editingCategory === leaf.name;
                    const isSaving = savingCategory === leaf.name;

                    return (
                      <div key={`${group.name}:${leaf.name}`} className="fg-category-leaf-row">
                        <label className="fg-category-leaf-label">
                          <input
                            type="checkbox"
                            checked={selected.includes(leaf.name)}
                            onChange={() => toggleLeaf(leaf.name)}
                          />
                          <span className="fg-category-leaf-name" title={leaf.name}>{leaf.name}</span>
                        </label>

                        <span className="fg-category-leaf-value">{leaf.txCount}</span>

                        <button type="button" className="fg-category-edit-btn" onClick={() => openRename(leaf.name)} disabled={isSaving}>
                          ✎
                        </button>

                        {isEditing ? (
                          <div className="fg-category-edit-inline">
                            <input
                              className="fg-input"
                              value={editingValue}
                              onChange={(event) => setEditingValue(event.target.value)}
                            />
                            <button type="button" className="fg-btn-secondary" onClick={() => saveRename(leaf.name)} disabled={isSaving}>
                              {isSaving ? "Salvando..." : "Salvar"}
                            </button>
                            <button
                              type="button"
                              className="fg-btn-secondary"
                              onClick={() => {
                                setEditingCategory("");
                                setEditingValue("");
                              }}
                              disabled={isSaving}
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}

        {!filteredGroups.length ? <div className="fg-empty">Nenhuma categoria encontrada.</div> : null}
      </div>

      <div className="fg-field-note">Categorias selecionadas: {selected.length} | Total visivel: {visibleLeaves.length}</div>
      <div className="fg-field-note">Soma de gastos na arvore: {brl(filteredGroups.reduce((sum, group) => sum + group.totalAbs, 0))}</div>
    </div>
  );
}
