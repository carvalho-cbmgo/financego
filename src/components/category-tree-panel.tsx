"use client";

import { useEffect, useMemo, useState, useTransition, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { brl } from "@/lib/format";
import { notifyGlobalLoading } from "@/components/global-loading-overlay";
import { ROOT_CATEGORY_NAME, normalizeCategoryName } from "@/lib/category-catalog";
import type { CategoryGroupStats } from "@/lib/category-tree";

type CategoryCatalogItem = {
  name: string;
  parentName: string;
};

type CategoryUsage = {
  txCount: number;
  totalAbs: number;
};

type TreeNode = {
  name: string;
  parentName: string;
  txCount: number;
  totalAbs: number;
  children: string[];
};

type DialogState =
  | { mode: "create" }
  | { mode: "edit"; categoryName: string }
  | { mode: "add_subcategory"; categoryName: string }
  | { mode: "delete"; categoryName: string }
  | null;

type ContextMenuState = {
  categoryName: string;
  x: number;
  y: number;
};

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

function sortNames(values: string[]) {
  return [...values].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function usageFromGroups(groups: CategoryGroupStats[]) {
  const usage: Record<string, CategoryUsage> = {};
  for (const group of groups || []) {
    for (const leaf of group.leaves || []) {
      const txCount = Number(leaf.txCount || 0);
      const totalAbs = Number(leaf.totalAbs || 0);
      if (txCount <= 0 && totalAbs <= 0) continue;

      const key = normalizeCategoryName(leaf.name);
      if (!key) continue;
      if (!usage[key]) usage[key] = { txCount: 0, totalAbs: 0 };
      usage[key].txCount += txCount;
      usage[key].totalAbs += totalAbs;
    }
  }
  return usage;
}

function dedupeCatalog(rows: CategoryCatalogItem[]) {
  const map = new Map<string, string>();
  for (const row of rows || []) {
    const name = normalizeCategoryName(row.name);
    if (!name) continue;
    const parentName = normalizeCategoryName(row.parentName || ROOT_CATEGORY_NAME);
    map.set(name, name === ROOT_CATEGORY_NAME ? ROOT_CATEGORY_NAME : parentName || ROOT_CATEGORY_NAME);
  }

  if (!map.has(ROOT_CATEGORY_NAME)) map.set(ROOT_CATEGORY_NAME, ROOT_CATEGORY_NAME);

  const names = Array.from(map.keys());
  for (const name of names) {
    if (name === ROOT_CATEGORY_NAME) continue;
    const parentName = map.get(name) || ROOT_CATEGORY_NAME;
    if (!map.has(parentName)) map.set(parentName, ROOT_CATEGORY_NAME);
    if (name === parentName) map.set(name, ROOT_CATEGORY_NAME);
  }

  return Array.from(map.entries()).map(([name, parentName]) => ({ name, parentName }));
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
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [nameValue, setNameValue] = useState("");
  const [parentValue, setParentValue] = useState(ROOT_CATEGORY_NAME);
  const [catalog, setCatalog] = useState<CategoryCatalogItem[]>(() => dedupeCatalog(input.categoriesCatalog || []));
  const [usage, setUsage] = useState<Record<string, CategoryUsage>>(() => usageFromGroups(input.groups || []));
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  const selectedSignature = useMemo(() => stableCsv(input.selectedCategories), [input.selectedCategories]);

  useEffect(() => {
    setSelected(input.selectedCategories);
  }, [selectedSignature, input.selectedCategories]);

  useEffect(() => {
    const nextCatalog = dedupeCatalog(input.categoriesCatalog || []);
    setCatalog(nextCatalog);
  }, [input.categoriesCatalog]);

  const usageSignature = useMemo(
    () =>
      (input.groups || [])
        .flatMap((group) => group.leaves.map((leaf) => `${leaf.name}:${leaf.txCount}:${leaf.totalAbs}`))
        .sort((a, b) => a.localeCompare(b, "pt-BR"))
        .join("|"),
    [input.groups],
  );

  useEffect(() => {
    setUsage(usageFromGroups(input.groups || []));
  }, [usageSignature, input.groups]);

  const normalizedCatalog = useMemo(() => {
    const fromCatalog = dedupeCatalog(catalog);
    const map = new Map<string, string>();

    for (const row of fromCatalog) {
      map.set(row.name, row.parentName || ROOT_CATEGORY_NAME);
    }

    for (const key of Object.keys(usage || {})) {
      const name = normalizeCategoryName(key);
      if (!map.has(name)) map.set(name, ROOT_CATEGORY_NAME);
    }

    if (!map.has(ROOT_CATEGORY_NAME)) map.set(ROOT_CATEGORY_NAME, ROOT_CATEGORY_NAME);

    const rows = Array.from(map.entries()).map(([name, parentName]) => ({ name, parentName }));
    return dedupeCatalog(rows);
  }, [catalog, usage]);

  const tree = useMemo(() => {
    const nodeMap = new Map<string, TreeNode>();

    for (const row of normalizedCatalog) {
      const name = normalizeCategoryName(row.name);
      const parentName = name === ROOT_CATEGORY_NAME ? ROOT_CATEGORY_NAME : normalizeCategoryName(row.parentName || ROOT_CATEGORY_NAME);
      const metrics = usage[name] || { txCount: 0, totalAbs: 0 };

      nodeMap.set(name, {
        name,
        parentName,
        txCount: Number(metrics.txCount || 0),
        totalAbs: Number(metrics.totalAbs || 0),
        children: [],
      });
    }

    if (!nodeMap.has(ROOT_CATEGORY_NAME)) {
      nodeMap.set(ROOT_CATEGORY_NAME, {
        name: ROOT_CATEGORY_NAME,
        parentName: ROOT_CATEGORY_NAME,
        txCount: 0,
        totalAbs: 0,
        children: [],
      });
    }

    for (const node of Array.from(nodeMap.values())) {
      if (node.name === ROOT_CATEGORY_NAME) continue;
      const parentName = node.parentName && node.parentName !== node.name ? node.parentName : ROOT_CATEGORY_NAME;
      if (!nodeMap.has(parentName)) {
        nodeMap.set(parentName, {
          name: parentName,
          parentName: ROOT_CATEGORY_NAME,
          txCount: 0,
          totalAbs: 0,
          children: [],
        });
      }
      const parent = nodeMap.get(parentName)!;
      if (!parent.children.includes(node.name)) parent.children.push(node.name);
    }

    for (const node of Array.from(nodeMap.values())) {
      node.children = sortNames(node.children);
    }

    const rootChildren = sortNames((nodeMap.get(ROOT_CATEGORY_NAME)?.children || []).filter((name) => name !== ROOT_CATEGORY_NAME));

    return { nodeMap, rootChildren };
  }, [normalizedCatalog, usage]);

  useEffect(() => {
    setOpenMap((current) => {
      const next: Record<string, boolean> = {};
      for (const name of tree.nodeMap.keys()) {
        if (name === ROOT_CATEGORY_NAME) continue;
        next[name] = typeof current[name] === "boolean" ? current[name] : false;
      }
      return next;
    });
  }, [tree.nodeMap]);

  useEffect(() => {
    if (!contextMenu) return;

    function closeMenu() {
      setContextMenu(null);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") closeMenu();
    }

    window.addEventListener("click", closeMenu);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [contextMenu]);

  const descendantsMap = useMemo(() => {
    const memo = new Map<string, string[]>();

    function collect(name: string, trail: Set<string>) {
      if (memo.has(name)) return memo.get(name)!;
      if (trail.has(name)) return [name];

      const node = tree.nodeMap.get(name);
      if (!node) return [name];

      const nextTrail = new Set(trail);
      nextTrail.add(name);

      const result = [name];
      for (const child of node.children) {
        for (const desc of collect(child, nextTrail)) result.push(desc);
      }

      const unique = Array.from(new Set(result));
      memo.set(name, unique);
      return unique;
    }

    for (const name of tree.nodeMap.keys()) collect(name, new Set());
    return memo;
  }, [tree.nodeMap]);

  const query = normalizeValue(searchText);

  const visibleSet = useMemo(() => {
    const names = Array.from(tree.nodeMap.keys()).filter((name) => name !== ROOT_CATEGORY_NAME);
    if (!query) return new Set(names);

    const set = new Set<string>();
    const parentByName = new Map<string, string>();
    for (const node of tree.nodeMap.values()) parentByName.set(node.name, node.parentName);

    function includeAncestors(name: string) {
      let cursor = name;
      const protection = new Set<string>();
      while (cursor && !protection.has(cursor)) {
        protection.add(cursor);
        if (cursor !== ROOT_CATEGORY_NAME) set.add(cursor);
        const parent = parentByName.get(cursor);
        if (!parent || parent === cursor) break;
        cursor = parent;
      }
    }

    for (const name of names) {
      if (!normalizeValue(name).includes(query)) continue;
      includeAncestors(name);
      const descendants = descendantsMap.get(name) || [name];
      for (const desc of descendants) {
        if (desc !== ROOT_CATEGORY_NAME) set.add(desc);
      }
    }

    return set;
  }, [tree.nodeMap, descendantsMap, query]);

  const parentOptions = useMemo(() => {
    const names = Array.from(tree.nodeMap.keys());
    const sorted = sortNames(names.filter((name) => name !== ROOT_CATEGORY_NAME));
    return [ROOT_CATEGORY_NAME, ...sorted];
  }, [tree.nodeMap]);

  const visibleCategoryNames = useMemo(() => {
    return sortNames(Array.from(visibleSet));
  }, [visibleSet]);

  const selectedLookup = useMemo(() => new Set(selected), [selected]);

  const visibleSpent = useMemo(() => {
    let total = 0;
    for (const name of visibleSet) {
      total += Number(usage[name]?.totalAbs || 0);
    }
    return total;
  }, [visibleSet, usage]);

  function refreshServerState() {
    startTransition(() => {
      router.refresh();
    });
  }

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

  function toggleNodeSelection(categoryName: string) {
    const targets = (descendantsMap.get(categoryName) || [categoryName]).filter((name) => name !== ROOT_CATEGORY_NAME);
    const allSelected = targets.length > 0 && targets.every((name) => selectedLookup.has(name));

    let next: string[];
    if (allSelected) {
      const toRemove = new Set(targets);
      next = selected.filter((name) => !toRemove.has(name));
    } else {
      next = Array.from(new Set([...selected, ...targets]));
    }

    setSelected(next);
    navigateWith(next);
  }

  function clearSelection() {
    setSelected([]);
    navigateWith([]);
  }

  function selectVisible() {
    const next = Array.from(new Set([...selected, ...visibleCategoryNames]));
    setSelected(next);
    navigateWith(next);
  }

  function toggleOpen(categoryName: string) {
    setOpenMap((current) => ({ ...current, [categoryName]: !current[categoryName] }));
  }

  function expandAll() {
    const entries = visibleCategoryNames.map((name) => [name, true] as const);
    setOpenMap((current) => ({ ...current, ...Object.fromEntries(entries) }));
  }

  function collapseAll() {
    const entries = visibleCategoryNames.map((name) => [name, false] as const);
    setOpenMap((current) => ({ ...current, ...Object.fromEntries(entries) }));
  }

  async function deleteSelectedCategories() {
    const targets = Array.from(
      new Set(
        selected.filter((name) => name !== ROOT_CATEGORY_NAME && normalizeCategoryName(name) !== normalizeCategoryName("Outros")),
      ),
    );

    if (!targets.length) {
      setMessage("Selecione ao menos uma categoria válida para exclusão.");
      return;
    }

    const confirmed = window.confirm(`Excluir ${targets.length} categoria(s) selecionada(s)?`);
    if (!confirmed) return;

    setIsWorking(true);
    setContextMenu(null);
    setMessage("");
    notifyGlobalLoading(true);

    try {
      let removed = 0;
      const failed: string[] = [];

      for (const categoryName of targets) {
        const response = await fetch("/api/categories/manage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "delete",
            category_name: categoryName,
          }),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          failed.push(String(data?.error || categoryName));
          continue;
        }

        applyLocalDelete(normalizeCategoryName(categoryName));
        removed += 1;
      }

      const nextSelected = selected.filter((name) => !targets.includes(name));
      setSelected(nextSelected);
      navigateWith(nextSelected);
      if (removed > 0) refreshServerState();

      if (!failed.length) {
        setMessage(`${removed} categoria(s) excluída(s) com sucesso.`);
      } else if (removed > 0) {
        setMessage(`${removed} categoria(s) excluída(s). Falhas: ${failed.slice(0, 2).join(" | ")}`);
      } else {
        setMessage(`Não foi possível excluir as categorias selecionadas: ${failed.slice(0, 2).join(" | ")}`);
      }
    } catch {
      setMessage("Erro inesperado ao excluir categorias selecionadas.");
    } finally {
      setIsWorking(false);
      notifyGlobalLoading(false);
    }
  }

  function openContextMenu(event: MouseEvent, categoryName: string) {
    event.preventDefault();
    event.stopPropagation();

    const menuWidth = 216;
    const menuHeight = 148;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const x = Math.max(6, Math.min(event.clientX, viewportWidth - menuWidth));
    const y = Math.max(6, Math.min(event.clientY, viewportHeight - menuHeight));

    setContextMenu({ categoryName, x, y });
    setMessage("");
  }

  function openDialog(mode: "create" | "edit" | "add_subcategory" | "delete", categoryName = ROOT_CATEGORY_NAME) {
    if (mode === "create") {
      setDialog({ mode: "create" });
      setContextMenu(null);
      setMessage("");
      setNameValue("");
      setParentValue(ROOT_CATEGORY_NAME);
      return;
    }

    setDialog({ mode, categoryName });
    setContextMenu(null);
    setMessage("");

    if (mode === "edit") {
      const node = tree.nodeMap.get(categoryName);
      setNameValue(categoryName);
      setParentValue(node?.parentName || ROOT_CATEGORY_NAME);
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

  function renameSelection(oldName: string, newName: string) {
    if (!selected.includes(oldName)) return false;
    const next = Array.from(new Set(selected.map((name) => (name === oldName ? newName : name))));
    setSelected(next);
    return navigateWith(next);
  }

  function removeSelection(categoryName: string) {
    if (!selected.includes(categoryName)) return false;
    const next = selected.filter((name) => name !== categoryName);
    setSelected(next);
    return navigateWith(next);
  }

  function applyLocalEdit(oldName: string, newName: string, newParent: string) {
    setCatalog((current) => {
      const nextRows = current.map((row) => {
        const rowName = normalizeCategoryName(row.name);
        const rowParent = normalizeCategoryName(row.parentName || ROOT_CATEGORY_NAME);

        if (rowName === oldName) {
          return {
            name: newName,
            parentName: newName === ROOT_CATEGORY_NAME ? ROOT_CATEGORY_NAME : newParent || ROOT_CATEGORY_NAME,
          };
        }

        if (rowParent === oldName) {
          return {
            name: row.name,
            parentName: newName,
          };
        }

        return {
          name: row.name,
          parentName: row.parentName || ROOT_CATEGORY_NAME,
        };
      });

      if (!nextRows.some((row) => normalizeCategoryName(row.name) === newName)) {
        nextRows.push({ name: newName, parentName: newParent || ROOT_CATEGORY_NAME });
      }

      return dedupeCatalog(nextRows);
    });

    setUsage((current) => {
      const next = { ...current };
      const metrics = next[oldName];
      if (metrics) {
        if (!next[newName]) next[newName] = { txCount: 0, totalAbs: 0 };
        next[newName] = {
          txCount: Number(next[newName].txCount || 0) + Number(metrics.txCount || 0),
          totalAbs: Number(next[newName].totalAbs || 0) + Number(metrics.totalAbs || 0),
        };
        delete next[oldName];
      }
      return next;
    });
  }

  function applyLocalAdd(categoryName: string, parentName: string) {
    setCatalog((current) => {
      const nextRows = [...current, { name: categoryName, parentName: parentName || ROOT_CATEGORY_NAME }];
      return dedupeCatalog(nextRows);
    });
  }

  function applyLocalDelete(categoryName: string) {
    setCatalog((current) => {
      const nextRows = current
        .filter((row) => normalizeCategoryName(row.name) !== categoryName)
        .map((row) => ({
          name: row.name,
          parentName: normalizeCategoryName(row.parentName || ROOT_CATEGORY_NAME) === categoryName ? ROOT_CATEGORY_NAME : row.parentName,
        }));
      return dedupeCatalog(nextRows);
    });

    setUsage((current) => {
      const next = { ...current };
      const metrics = next[categoryName];
      if (metrics) {
        const target = next.Outros || { txCount: 0, totalAbs: 0 };
        next.Outros = {
          txCount: Number(target.txCount || 0) + Number(metrics.txCount || 0),
          totalAbs: Number(target.totalAbs || 0) + Number(metrics.totalAbs || 0),
        };
        delete next[categoryName];
      }
      return next;
    });
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
        setMessage(String(data?.error || "Não foi possível atualizar categoria."));
        return;
      }

      setMessage("Categorias atualizadas em tempo real.");
      onSuccess();
      refreshServerState();
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

    if (dialog.mode === "create") {
      const nextNameRaw = nameValue.trim();
      if (!nextNameRaw) {
        setMessage("Informe o nome da categoria.");
        return;
      }

      const nextName = normalizeCategoryName(nextNameRaw);
      const nextParent = normalizeCategoryName(parentValue || ROOT_CATEGORY_NAME);

      runCategoryAction(
        {
          action: "add_subcategory",
          category_name: ROOT_CATEGORY_NAME,
          new_name: nextName,
          parent_name: nextParent,
        },
        () => {
          applyLocalAdd(nextName, nextParent);
          closeDialog();
          setOpenMap((current) => ({ ...current, [nextParent]: true }));
        },
      );
      return;
    }

    if (dialog.mode === "edit") {
      const nextNameRaw = nameValue.trim();
      if (!nextNameRaw) {
        setMessage("Informe um nome válido para categoria.");
        return;
      }

      const oldName = normalizeCategoryName(dialog.categoryName);
      const nextName = normalizeCategoryName(nextNameRaw);
      const nextParent = normalizeCategoryName(parentValue || ROOT_CATEGORY_NAME);

      runCategoryAction(
        {
          action: "edit",
          category_name: oldName,
          new_name: nextName,
          parent_name: nextParent || ROOT_CATEGORY_NAME,
        },
        () => {
          applyLocalEdit(oldName, nextName, nextParent);
          closeDialog();
          renameSelection(oldName, nextName);
        },
      );
      return;
    }

    if (dialog.mode === "add_subcategory") {
      const nextNameRaw = nameValue.trim();
      if (!nextNameRaw) {
        setMessage("Informe o nome da subcategoria.");
        return;
      }

      const nextName = normalizeCategoryName(nextNameRaw);
      const nextParent = normalizeCategoryName(parentValue || ROOT_CATEGORY_NAME);

      runCategoryAction(
        {
          action: "add_subcategory",
          category_name: dialog.categoryName,
          new_name: nextName,
          parent_name: nextParent,
        },
        () => {
          applyLocalAdd(nextName, nextParent);
          closeDialog();
          setOpenMap((current) => ({ ...current, [nextParent]: true }));
        },
      );
      return;
    }

    const targetName = normalizeCategoryName(dialog.categoryName);
    runCategoryAction(
      {
        action: "delete",
        category_name: targetName,
      },
      () => {
        applyLocalDelete(targetName);
        closeDialog();
        removeSelection(targetName);
      },
    );
  }

  function renderNode(categoryName: string, depth: number) {
    if (!visibleSet.has(categoryName)) return null;

    const node = tree.nodeMap.get(categoryName);
    if (!node) return null;

    const rawChildren = node.children.filter((name) => visibleSet.has(name));
    const hasChildren = rawChildren.length > 0;
    const queryActive = !!query;
    const isOpen = queryActive ? true : !!openMap[categoryName];

    const subtree = (descendantsMap.get(categoryName) || [categoryName]).filter((name) => name !== ROOT_CATEGORY_NAME);
    const selectedCount = subtree.filter((name) => selectedLookup.has(name)).length;
    const allSelected = subtree.length > 0 && selectedCount === subtree.length;
    const partialSelected = selectedCount > 0 && !allSelected;

    return (
      <div key={categoryName} className="fg-category-node-wrap">
        <div
          className={`fg-category-node-row ${allSelected ? "is-selected" : partialSelected ? "is-partial" : ""}`}
          style={{ paddingLeft: `${4 + depth * 14}px` }}
          onContextMenu={(event) => openContextMenu(event, categoryName)}
          title="Clique com o botão direito para editar categoria"
        >
          <button
            type="button"
            className="fg-category-group-toggle"
            onClick={() => (hasChildren ? toggleOpen(categoryName) : undefined)}
            disabled={!hasChildren}
            aria-label={hasChildren ? `Expandir ${categoryName}` : `Categoria ${categoryName}`}
          >
            {hasChildren ? (isOpen ? "-" : "+") : ""}
          </button>

          <label className="fg-category-leaf-label">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => toggleNodeSelection(categoryName)}
            />
            <span className="fg-category-leaf-name" title={categoryName}>
              {categoryName}
              {partialSelected ? " (parcial)" : ""}
            </span>
          </label>
          <span className="fg-category-leaf-value">{node.txCount}</span>
        </div>

        {isOpen ? rawChildren.map((childName) => renderNode(childName, depth + 1)) : null}
      </div>
    );
  }

  return (
    <div className="fg-category-tree-wrap">
      <div className="fg-category-tree-top">
        <div className="fg-category-search-row">
          <input
            className="fg-input fg-category-search-input"
            placeholder="Texto da busca"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
          <div className="fg-category-tree-actions">
            <button type="button" className="fg-category-tool-btn is-create" onClick={() => openDialog("create")} disabled={isPending || isWorking} title="Criar nova categoria">
              +
            </button>
            <button
              type="button"
              className="fg-category-tool-btn is-delete"
              onClick={deleteSelectedCategories}
              disabled={isPending || isWorking || !selected.length}
              title="Excluir categorias selecionadas"
            >
              DEL
            </button>
            <button type="button" className="fg-category-tool-btn" onClick={expandAll} disabled={isPending || isWorking || !visibleCategoryNames.length} title="Expandir categorias">
              +
            </button>
            <button type="button" className="fg-category-tool-btn" onClick={collapseAll} disabled={isPending || isWorking || !visibleCategoryNames.length} title="Recolher categorias">
              -
            </button>
            <button type="button" className="fg-category-tool-btn" onClick={selectVisible} disabled={isPending || isWorking || !visibleCategoryNames.length} title="Selecionar categorias visíveis">
              {"\u2713"}
            </button>
            <button type="button" className="fg-category-tool-btn" onClick={clearSelection} disabled={isPending || isWorking || !selected.length} title="Limpar filtro de categorias">
              x
            </button>
          </div>
        </div>
      </div>

      {message ? <div className="fg-field-note">{message}</div> : null}

      <div className="fg-category-tree-list">
        {tree.rootChildren.length ? tree.rootChildren.map((name) => renderNode(name, 0)) : null}
        {!tree.rootChildren.length ? <div className="fg-empty">Nenhuma categoria encontrada.</div> : null}
        {tree.rootChildren.length && !visibleCategoryNames.length ? <div className="fg-empty">Nenhuma categoria encontrada.</div> : null}
      </div>

      <div className="fg-field-note">Selecionadas: {selected.length} | Visíveis: {visibleCategoryNames.length} | Total: {brl(visibleSpent)}</div>

      {contextMenu ? (
        <div
          className="fg-category-context-menu"
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
        >
          <button
            type="button"
            className="fg-btn-secondary"
            onClick={() => openDialog("edit", contextMenu.categoryName)}
            disabled={isWorking || isPending || contextMenu.categoryName === ROOT_CATEGORY_NAME}
          >
            Editar categoria
          </button>
          <button
            type="button"
            className="fg-btn-secondary"
            onClick={() => openDialog("add_subcategory", contextMenu.categoryName)}
            disabled={isWorking || isPending}
          >
            Adicionar subcategoria
          </button>
          <button
            type="button"
            className="fg-btn-danger"
            onClick={() => openDialog("delete", contextMenu.categoryName)}
            disabled={isWorking || isPending || contextMenu.categoryName === ROOT_CATEGORY_NAME || contextMenu.categoryName === "Outros"}
          >
            Excluir categoria
          </button>
        </div>
      ) : null}

      {dialog ? (
        <div className="fg-category-dialog-backdrop" role="dialog" aria-modal="true">
          <div className="fg-category-dialog">
            <div className="fg-card-title">
              {dialog.mode === "create" ? "Nova categoria" : null}
              {dialog.mode === "edit" ? "Editar categoria" : null}
              {dialog.mode === "add_subcategory" ? "Adicionar subcategoria" : null}
              {dialog.mode === "delete" ? "Excluir categoria" : null}
            </div>

            {dialog.mode === "create" ? (
              <div className="fg-form">
                <label className="fg-field-label">
                  Nome
                  <input
                    className="fg-input"
                    value={nameValue}
                    onChange={(event) => setNameValue(event.target.value)}
                    placeholder="Nome da categoria"
                  />
                </label>
                <label className="fg-field-label">
                  Categoria Pai
                  <select className="fg-select" value={parentValue} onChange={(event) => setParentValue(event.target.value)}>
                    {parentOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}

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
                  placeholder="Nome da subcategoria"
                />
                <select className="fg-select" value={parentValue} onChange={(event) => setParentValue(event.target.value)}>
                  {parentOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <div className="fg-field-note">
                  Se categoria pai não for informada no cadastro, o sistema usa Raiz automaticamente.
                </div>
              </div>
            ) : null}

            {dialog.mode === "delete" ? (
              <div className="fg-field-note">
                A categoria <strong>{dialog.categoryName}</strong> será removida e os lançamentos vinculados serão movidos para <strong>Outros</strong>.
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



