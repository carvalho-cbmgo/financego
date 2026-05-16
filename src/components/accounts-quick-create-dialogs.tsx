"use client";

import { useEffect, useState } from "react";

type BankOption = {
  id: string;
  name: string;
  code?: string;
};

type DialogMode = "bank" | "checking" | "credit" | null;

export function AccountsQuickCreateDialogs(input: {
  banks: BankOption[];
}) {
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const hasBanks = input.banks.length > 0;

  useEffect(() => {
    function onKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") setDialogMode(null);
    }

    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, []);

  function closeDialog() {
    setDialogMode(null);
  }

  return (
    <>
      <div className="fg-accounts-quick-actions">
        <button type="button" className="fg-accounts-action-pill" onClick={() => setDialogMode("bank")}>
          <span className="fg-accounts-action-icon">BK</span>
          Cadastrar banco
        </button>
        <button type="button" className="fg-accounts-action-pill" onClick={() => setDialogMode("checking")} disabled={!hasBanks}>
          <span className="fg-accounts-action-icon">CC</span>
          Cadastrar Conta
        </button>
        <button type="button" className="fg-accounts-action-pill" onClick={() => setDialogMode("credit")} disabled={!hasBanks}>
          <span className="fg-accounts-action-icon">CR</span>
          Cadastrar cartao
        </button>
      </div>

      {!hasBanks ? (
        <p className="fg-field-note">Cadastre ao menos um banco antes de criar conta ou cartão.</p>
      ) : null}

      {dialogMode ? (
        <div className="fg-accounts-modal-backdrop" role="dialog" aria-modal="true" onClick={closeDialog}>
          <div className="fg-accounts-modal" onClick={(event) => event.stopPropagation()}>
            {dialogMode === "bank" ? (
              <>
                <div className="fg-card-title">Cadastrar banco</div>
                <form action="/api/banks/save" method="post" className="fg-form">
                  <input name="bank_name" required placeholder="Nome do banco (ex: NUBANK, BTG, CAIXA)" className="fg-input" />
                  <input name="bank_code" placeholder="Codigo opcional (ex: 260, 208, 104)" className="fg-input" />
                  <div className="fg-account-actions">
                    <button className="fg-btn">Confirmar criacao</button>
                    <button type="button" className="fg-btn-secondary" onClick={closeDialog}>Cancelar</button>
                  </div>
                </form>
              </>
            ) : null}

            {dialogMode === "checking" ? (
              <>
                <div className="fg-card-title">Cadastrar Conta</div>
                <form action="/api/accounts/save" method="post" className="fg-form">
                  <input type="hidden" name="account_type" value="CONTA_CORRENTE" />
                  <select name="bank_id" required className="fg-select" defaultValue={String(input.banks[0]?.id || "")}>
                    {input.banks.map((bank) => (
                      <option key={bank.id} value={bank.id}>
                        {bank.name} {bank.code ? `(${bank.code})` : ""}
                      </option>
                    ))}
                  </select>
                  <input name="account_name" required placeholder="Nome da conta" className="fg-input" />
                  <input name="balance" type="number" step="0.01" placeholder="Saldo inicial (opcional)" className="fg-input" />
                  <div className="fg-account-actions">
                    <button className="fg-btn">Confirmar criacao</button>
                    <button type="button" className="fg-btn-secondary" onClick={closeDialog}>Cancelar</button>
                  </div>
                </form>
              </>
            ) : null}

            {dialogMode === "credit" ? (
              <>
                <div className="fg-card-title">Cadastrar cartao</div>
                <form action="/api/accounts/save" method="post" className="fg-form">
                  <input type="hidden" name="account_type" value="CARTAO_DE_CREDITO" />
                  <select name="bank_id" required className="fg-select" defaultValue={String(input.banks[0]?.id || "")}>
                    {input.banks.map((bank) => (
                      <option key={bank.id} value={bank.id}>
                        {bank.name} {bank.code ? `(${bank.code})` : ""}
                      </option>
                    ))}
                  </select>
                  <input name="account_name" required placeholder="Nome do cartao" className="fg-input" />
                  <input name="balance" type="number" step="0.01" placeholder="Fatura inicial (opcional)" className="fg-input" />
                  <div className="fg-account-actions">
                    <button className="fg-btn">Confirmar criacao</button>
                    <button type="button" className="fg-btn-secondary" onClick={closeDialog}>Cancelar</button>
                  </div>
                </form>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
