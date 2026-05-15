"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { brl } from "@/lib/format";
import { notifyGlobalLoading } from "@/components/global-loading-overlay";
import { ROOT_CATEGORY_NAME, normalizeCategoryName } from "@/lib/category-catalog";
import type { CategoryGroupStats, CategoryLeafStats } from "@/lib/category-tree";

type CategoryCatalogItem = {
  name: string;
  parentName: string;
};

type DialogState =
  | { mode: "edit"; categoryName: string }
  | { mode: "add_subcategory"; categoryName: string }
  | { mode: "delete"; categoryName: string }
  | null;

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

function sortedUnique(values: string[]) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export function CategoryTreePanel(input: {
  groups: CategoryGroupStats[];
  selectedCategories: string[];
  selectedBankId: string;
  selectedAccountIds: string[];
  selectedAccountId: string;
  categoriesCatalog?: CategoryCatalogItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string[]>(input.selectedCategories);
  const [searchText, setSearchText] = useState("");
  const [message, setMessage] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [menuCategory, setMenuCategory] = useState("");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [nameValue, setNameValue] = useState("");
  const [parentValue, setParentValue] = useState(ROOT_CATEGORY_NAME);
  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() => {
    return Object.fromEntries(input.groups.map((group) => [group.name, false]));
  });

  const selectedSignature = useMemo(() => stableCsv(input.selectedCategories), [input.selectedCategories]);

  useEffect(() => {
    setSelected(input.selectedCategories);
  }, [selectedSignature, input.selectedCategories]);

  useEffect(() => {
    setOpenMap((current) => {
      const next = { ...current };
      for (const group of input.groups) {
        if (typeof next[group.name] !== "boolean") next[group.name] = false;
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

  const categoryParentMap = useMemo(() => {
    const map = new Map<string, string>();

    for (const group of input.groups) {
      for (const leaf of group.leaves) map.set(leaf.name, ROOT_CATEGORY_NAME);
    }

    for (const item of input.categoriesCatalog || []) {
      const name = normalizeCategoryName(item.name);
      const parentName = normalizeCategoryName(item.parentName || ROOT_CATEGORY_NAME);
      map.set(name, parentName);
    }

    map.set(ROOT_CATEGORY_NAME, ROOT_CATEGORY_NAME);
    return map;
  }, [input.groups, input.categoriesCatalog]);

  const parentOptions = useMemo(() => {
    const names = [ROOT_CATEGORY_NAME];
    for (const group of input.groups) {
      for (const leaf of group.leaves) names.push(leaf.name);
    }
    for (const item of input.categoriesCatalog || []) names.push(normalizeCategoryName(item.name));
    return sortedUnique(names.map((name) => normalizeCategoryName(name)));
  }, [input.groups, input.categoriesCatalog]);

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
    if (nextHref === currentHref) return false;

    notifyGlobalLoading(true);
    startTransition(() => {
      router.replace(nextHref, { scroll: false });
    });
    return true;
  }

  function refreshPanel() {
    notifyGlobalLoading(true);
    startTransition(() => {
      router.refresh();
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

  function expandAll() {
    setOpenMap(Object.fromEntries(filteredGroups.map((group) => [group.name, true])));
  }

  function collapseAll() {
    setOpenMap(Object.fromEntries(filteredGroups.map((group) => [group.name, false])));
  }

  function openCategoryMenu(categoryName: string) {
    setMenuCategory((current) => (current === categoryName ? "" : categoryName));
    setMessage("");
  }

  function openDialog(mode: "edit" | "add_subcategory" | "delete", categoryName: string) {
    setDialog({ mode, categoryName });
    setMenuCategory("");
    setMessage("");

    if (mode === "edit") {
      setNameValue(categoryName);
      setParentValue(categoryParentMap.get(categoryName) || ROOT_CATEGORY_NAME);
      return;
    }

    if (mode === "add_subcategory") {
      setNameValue("");
      setParentValue(categoryName || ROOT_CATEGORY_NAME);
      return;
    }

    setNameValue("");
    setParentValue(ROOT_CATEGORY_NAME);
  }

  function closeDialog() {
    setDialog(null);
    setNameValue("");
    setParentValue(ROOT_CATEGORY_NAME);
  }

  function applySelectionRename(oldName: string, newName: string) {
    if (!selected.includes(oldName)) return false;
    const next = Array.from(new Set(selected.map((item) => (item === oldName ? newName : item))));
    setSelected(next);
    return navigateWith(next);
  }

  function applySelectionDelete(oldName: string) {
    if (!selected.includes(oldName)) return false;
    const next = selected.filter((item) => item !== oldName);
    setSelected(next);
    return navigateWith(next);
  }

  async function runCategoryAction(payload: Record<string, string>, onSuccess: () => void) {
    setIsWorking(true);
    setMessage("");
    notifyGlobalLoading(true);

    try {
      const response = await fetch("/api/categories/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(String(data?.error || "Nao foi possivel atualizar categoria."));
        return;
      }

      setMessage("Categorias atualizadas com sucesso.");
      onSuccess();
    } catch {
      setMessage("Erro inesperado ao atualizar categoria.");
    } finally {
      setIsWorking(false);
      notifyGlobalLoading(false);
    }
  }

  function confirmDialogAction() {
    if (!dialog) return;
    if (isWorking || isPending) return;

    if (dialog.mode === "edit") {
      const nextName = nameValue.trim();
      if (!nextName) {
        setMessage("Informe um nome valido para categoria.");
        return;
      }

      const selectedOldName = dialog.categoryName;
      const selectedNewName = normalizeCategoryName(nextName);
      const selectedParent = normalizeCategoryName(parentValue || ROOT_CATEGORY_NAME);

      runCategoryAction(
        {
          action: "edit",
          category_name: selectedOldName,
          new_name: selectedNewName,
          parent_name: selectedParent || ROOT_CATEGORY_NAME,
        },
        () => {
          closeDialog();
          const redirected = applySelectionRename(selectedOldName, selectedNewName);
          if (!redirected) refreshPanel();
        },
      );
      return;
    }

    if (dialog.mode === "add_subcategory") {
      const nextName = nameValue.trim();
      if (!nextName) {
        setMessage("Informe o nome da sub-categoria.");
        return;
      }

      runCategoryAction(
        {
          action: "add_subcategory",
          category_name: dialog.categoryName,
          new_name: normalizeCategoryName(nextName),
          parent_name: normalizeCategoryName(parentValue || ROOT_CATEGORY_NAME),
        },
        () => {
          closeDialog();
          refreshPanel();
        },
      );
      return;
    }

    runCategoryAction(
      {
        action: "delete",
        category_name: dialog.categoryName,
      },
      () => {
        closeDialog();
        const redirected = applySelectionDelete(dialog.categoryName);
        if (!redirected) refreshPanel();
      },
    );
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
          <button type="button" className="fg-btn-secondary" onClick={selectVisible} disabled={isPending || isWorking || !visibleLeaves.length}>
            Marcar visiveis
          </button>
          <button type="button" className="fg-btn-secondary" onClick={clearSelection} disabled={isPending || isWorking || !selected.length}>
            Limpar filtro
          </button>
          <button type="button" className="fg-btn-secondary" onClick={expandAll} disabled={isPending || isWorking || !filteredGroups.length}>
            Expandir
          </button>
          <button type="button" className="fg-btn-secondary" onClick={collapseAll} disabled={isPending || isWorking || !filteredGroups.length}>
            Recolher
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
                    const menuOpen = menuCategory === leaf.name;
                    const disableActions = isWorking || isPending || leaf.name === ROOT_CATEGORY_NAME;

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

                        <div className="fg-category-inline-actions">
                          <button
                            type="button"
                            className="fg-category-edit-btn"
                            onClick={() => openCategoryMenu(leaf.name)}
                            disabled={isWorking || isPending}
                            aria-label={`Editar categoria ${leaf.name}`}
                          >
                            E
                          </button>

                          {menuOpen ? (
                            <div className="fg-category-mini-menu">
                              <button
                                type="button"
                                className="fg-btn-secondary"
                                onClick={() => openDialog("edit", leaf.name)}
                                disabled={disableActions}
                              >
                                Editar categoria
                              </button>
                              <button
                                type="button"
                                className="fg-btn-secondary"
                                onClick={() => openDialog("add_subcategory", leaf.name)}
                                disabled={isWorking || isPending}
                              >
                                Adicionar sub-categoria
                              </button>
                              <button
                                type="button"
                                className="fg-btn-danger"
                                onClick={() => openDialog("delete", leaf.name)}
                                disabled={disableActions || leaf.name === "Outros"}
                              >
                                Excluir categoria
                              </button>
                            </div>
                          ) : null}
                        </div>
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

      {dialog ? (
        <div className="fg-category-dialog-backdrop" role="dialog" aria-modal="true">
          <div className="fg-category-dialog">
            <div className="fg-card-title">
              {dialog.mode === "edit" ? "Editar categoria" : null}
              {dialog.mode === "add_subcategory" ? "Adicionar sub-categoria" : null}
              {dialog.mode === "delete" ? "Excluir categoria" : null}
            </div>

            {dialog.mode === "edit" ? (
              <div className="fg-form">
                <input
                  className="fg-input"
                  value={nameValue}
                  onChange={(event) => setNameValue(event.target.value)}
                  placeholder="Novo nome da categoria"
                />
                <select className="fg-select" value={parentValue} onChange={(event) => setParentValue(event.target.value)}>
                  {parentOptions
                    .filter((name) => name !== dialog.categoryName || name === ROOT_CATEGORY_NAME)
                    .map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                </select>
              </div>
            ) : null}

            {dialog.mode === "add_subcategory" ? (
              <div className="fg-form">
                <input
                  className="fg-input"
                  value={nameValue}
                  onChange={(event) => setNameValue(event.target.value)}
                  placeholder="Nome da sub-categoria"
                />
                <select className="fg-select" value={parentValue} onChange={(event) => setParentValue(event.target.value)}>
                  {parentOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <div className="fg-field-note">
                  Se categoria pai nao for informada no cadastro, o sistema usa Raiz automaticamente.
                </div>
              </div>
            ) : null}

            {dialog.mode === "delete" ? (
              <div className="fg-field-note">
                A categoria <strong>{dialog.categoryName}</strong> sera removida e os lancamentos vinculados serao movidos para <strong>Outros</strong>.
              </div>
            ) : null}

            <div className="fg-account-actions">
              <button type="button" className="fg-btn" onClick={confirmDialogAction} disabled={isWorking || isPending}>
                {isWorking ? "Salvando..." : "Confirmar"}
              </button>
              <button type="button" className="fg-btn-secondary" onClick={closeDialog} disabled={isWorking || isPending}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

