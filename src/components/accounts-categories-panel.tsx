"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { notifyGlobalLoading } from "@/components/global-loading-overlay";
import { ROOT_CATEGORY_NAME } from "@/lib/category-catalog";

type CategoryItem = {
  name: string;
  parentName: string;
  txCount: number;
  budgetCount: number;
  isRoot: boolean;
};

type DialogState =
  | { mode: "edit"; categoryName: string; currentParentName: string }
  | { mode: "add_subcategory"; categoryName: string }
  | { mode: "delete"; categoryName: string }
  | null;

function sortNames(values: string[]) {
  return [...values].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export function AccountsCategoriesPanel(input: {
  categories: CategoryItem[];
  catalogEnabled: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [menuFor, setMenuFor] = useState("");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [nameValue, setNameValue] = useState("");
  const [parentValue, setParentValue] = useState(ROOT_CATEGORY_NAME);

  const parentOptions = useMemo(() => {
    const names = new Set<string>([ROOT_CATEGORY_NAME]);
    for (const item of input.categories) names.add(item.name);
    return sortNames(Array.from(names));
  }, [input.categories]);

  function openDialog(nextDialog: DialogState) {
    setDialog(nextDialog);
    setMenuFor("");

    if (!nextDialog) return;

    if (nextDialog.mode === "edit") {
      setNameValue(nextDialog.categoryName);
      setParentValue(nextDialog.currentParentName || ROOT_CATEGORY_NAME);
      return;
    }

    if (nextDialog.mode === "add_subcategory") {
      setNameValue("");
      setParentValue(nextDialog.categoryName || ROOT_CATEGORY_NAME);
      return;
    }

    setNameValue("");
    setParentValue(ROOT_CATEGORY_NAME);
  }

  async function runAction(payload: Record<string, string>) {
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
        setMessage(String(data?.error || "Não foi possível processar a ação da categoria."));
        return;
      }

      setMessage("Categoria atualizada com sucesso.");
      openDialog(null);

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setMessage("Erro inesperado ao processar categoria.");
    } finally {
      notifyGlobalLoading(false);
    }
  }

  function submitDialog() {
    if (!dialog) return;

    if (dialog.mode === "edit") {
      const nextName = nameValue.trim();
      if (!nextName) {
        setMessage("Informe um nome válido para a categoria.");
        return;
      }

      runAction({
        action: "edit",
        category_name: dialog.categoryName,
        new_name: nextName,
        parent_name: parentValue || ROOT_CATEGORY_NAME,
      });
      return;
    }

    if (dialog.mode === "add_subcategory") {
      const nextName = nameValue.trim();
      if (!nextName) {
        setMessage("Informe o nome da subcategoria.");
        return;
      }

      runAction({
        action: "add_subcategory",
        category_name: dialog.categoryName,
        parent_name: parentValue || dialog.categoryName || ROOT_CATEGORY_NAME,
        new_name: nextName,
      });
      return;
    }

    runAction({
      action: "delete",
      category_name: dialog.categoryName,
    });
  }

  return (
    <div className="fg-category-manager-wrap">
      {!input.catalogEnabled ? (
        <div className="fg-empty" style={{ borderColor: "#cfb0b0", background: "#fff7f7", color: "#7c1d1d" }}>
          Estrutura de categorias ainda não habilitada no banco. Execute a atualização do schema para ativar edição de pai/filho.
        </div>
      ) : null}

      {message ? <div className="fg-field-note">{message}</div> : null}

      <div className="fg-table-wrap">
        <table className="fg-table">
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Categoria pai</th>
              <th>Transações</th>
              <th>Orçamentos</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {input.categories.map((item) => {
              const menuOpen = menuFor === item.name;
              const editDeleteDisabled = isPending || item.isRoot || !input.catalogEnabled;
              const addDisabled = isPending || !input.catalogEnabled;

              return (
                <tr key={item.name}>
                  <td>{item.name}</td>
                  <td>{item.parentName}</td>
                  <td>{item.txCount}</td>
                  <td>{item.budgetCount}</td>
                  <td>
                    <div className="fg-category-inline-actions">
                      <button
                        type="button"
                        className="fg-category-edit-btn"
                        onClick={() => setMenuFor(menuOpen ? "" : item.name)}
                        disabled={isPending}
                        aria-label={`Editar categoria ${item.name}`}
                      >
                        E
                      </button>

                      {menuOpen ? (
                        <div className="fg-category-mini-menu">
                          <button
                            type="button"
                            className="fg-btn-secondary"
                            onClick={() => openDialog({ mode: "edit", categoryName: item.name, currentParentName: item.parentName })}
                            disabled={editDeleteDisabled}
                          >
                            Editar categoria
                          </button>
                          <button
                            type="button"
                            className="fg-btn-secondary"
                            onClick={() => openDialog({ mode: "add_subcategory", categoryName: item.name })}
                            disabled={addDisabled}
                          >
                            Adicionar subcategoria
                          </button>
                          <button
                            type="button"
                            className="fg-btn-danger"
                            onClick={() => openDialog({ mode: "delete", categoryName: item.name })}
                            disabled={editDeleteDisabled}
                          >
                            Excluir categoria
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {dialog ? (
        <div className="fg-category-dialog-backdrop" role="dialog" aria-modal="true">
          <div className="fg-category-dialog">
            <div className="fg-card-title">
              {dialog.mode === "edit" ? "Editar categoria" : null}
              {dialog.mode === "add_subcategory" ? "Adicionar subcategoria" : null}
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
                  placeholder="Nome da subcategoria"
                />
                <select className="fg-select" value={parentValue} onChange={(event) => setParentValue(event.target.value)}>
                  {parentOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {dialog.mode === "delete" ? (
              <div className="fg-field-note">
                A categoria <strong>{dialog.categoryName}</strong> será removida e os lançamentos vinculados passarão para <strong>Outros</strong>.
              </div>
            ) : null}

            <div className="fg-account-actions">
              <button type="button" className="fg-btn" onClick={submitDialog} disabled={isPending || !input.catalogEnabled}>
                {isPending ? "Salvando..." : "Confirmar"}
              </button>
              <button type="button" className="fg-btn-secondary" onClick={() => openDialog(null)} disabled={isPending}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
