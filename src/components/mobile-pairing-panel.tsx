"use client";

import { useMemo, useState } from "react";

type PairResponse = {
  ok: boolean;
  device_public_id: string;
  device_token: string;
  warning?: string;
};

type MobilePairingPanelProps = {
  defaultDeviceName: string;
};

export function MobilePairingPanel({ defaultDeviceName }: MobilePairingPanelProps) {
  const [deviceName, setDeviceName] = useState(defaultDeviceName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [payload, setPayload] = useState<PairResponse | null>(null);

  const tokenPreview = useMemo(() => {
    if (!payload?.device_token) return "";
    if (payload.device_token.length < 18) return payload.device_token;
    return `${payload.device_token.slice(0, 8)}...${payload.device_token.slice(-8)}`;
  }, [payload]);

  async function createPairing() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setMessage("Gerando token de pareamento...");
    setPayload(null);

    try {
      const response = await fetch("/api/devices/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_name: deviceName.trim() || defaultDeviceName }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(String(data?.error || "Nao foi possivel gerar o pareamento."));
        return;
      }

      setPayload(data as PairResponse);
      setMessage("Pareamento gerado com sucesso. Salve os dados no app Android companion.");
    } catch (error: any) {
      setMessage(String(error?.message || "Erro inesperado ao gerar pareamento."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyValue(label: string, value: string) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setMessage(`${label} copiado para a area de transferencia.`);
    } catch {
      setMessage(`Nao foi possivel copiar ${label.toLowerCase()}. Copie manualmente.`);
    }
  }

  return (
    <div className="fg-mobile-pair-panel">
      <label className="fg-mobile-pair-label">
        Nome do dispositivo Android
        <input
          className="fg-mobile-pair-input"
          value={deviceName}
          onChange={(event) => setDeviceName(event.target.value)}
          placeholder="Ex.: Pixel pessoal"
          maxLength={80}
        />
      </label>

      <button type="button" className="fg-mobile-pair-btn" onClick={createPairing} disabled={isSubmitting}>
        {isSubmitting ? "Gerando..." : "Gerar novo pareamento"}
      </button>

      {payload ? (
        <div className="fg-mobile-pair-result">
          <div className="fg-mobile-pair-row">
            <div>
              <strong>Device Public ID</strong>
              <div className="fg-mobile-pair-value">{payload.device_public_id}</div>
            </div>
            <button type="button" className="fg-mobile-pair-copy" onClick={() => copyValue("Device Public ID", payload.device_public_id)}>
              Copiar
            </button>
          </div>

          <div className="fg-mobile-pair-row">
            <div>
              <strong>Device Token</strong>
              <div className="fg-mobile-pair-value">{payload.device_token}</div>
              <div className="fg-mobile-pair-note">Preview: {tokenPreview}</div>
            </div>
            <button type="button" className="fg-mobile-pair-copy" onClick={() => copyValue("Device Token", payload.device_token)}>
              Copiar
            </button>
          </div>

          <p className="fg-mobile-pair-note">
            {payload.warning || "Mostre o token apenas no momento da configuracao e salve no Android com seguranca."}
          </p>
        </div>
      ) : null}

      <p className="fg-mobile-pair-status" role="status" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
