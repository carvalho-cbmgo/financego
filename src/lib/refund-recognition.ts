import crypto from "crypto";

export type RefundInfo = {
  isRefund: boolean;
  refundStatus: "none" | "refund";
  refundMatchKey?: string;
  originalMerchant?: string;
  reason?: string;
};

function normalize(input?: string | null) {
  return (input || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/["'`´]/g, "")
    .replace(/[^a-z0-9\s\*\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectRefund(text?: string | null): RefundInfo {
  const s = normalize(text);

  const refundPatterns = [
    "estorno",
    "estornado",
    "reembolso",
    "reembolsado",
    "devolucao",
    "devolução",
    "chargeback",
    "credito de compra",
    "crédito de compra",
    "cancelamento de compra",
    "compra cancelada",
  ];

  const isRefund = refundPatterns.some((p) => s.includes(normalize(p)));

  if (!isRefund) {
    return { isRefund: false, refundStatus: "none" };
  }

  const originalMerchant = extractRefundMerchant(text || "");
  const refundMatchKey = makeRefundMatchKey(originalMerchant || text || "");

  return {
    isRefund: true,
    refundStatus: "refund",
    originalMerchant,
    refundMatchKey,
    reason: "texto_indica_estorno",
  };
}

export function extractRefundMerchant(text: string) {
  const patterns = [
    /estorno\s+de\s+"?([^"(]+)"?/i,
    /estorno\s+de\s+(.+?)(?:\s+\(|$)/i,
    /reembolso\s+de\s+"?([^"(]+)"?/i,
    /devolu[cç][aã]o\s+de\s+"?([^"(]+)"?/i,
    /compra\s+cancelada\s+(.+?)(?:\s+\(|$)/i,
  ];

  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) {
      return cleanMerchant(m[1]);
    }
  }

  // Caso Nubank: Estorno de "PG *CONFECCOES KACYUMA" (Pg *Confeccoes Kacyuma)
  const paren = text.match(/\(([^)]+)\)/);
  if (paren?.[1]) {
    return cleanMerchant(paren[1]);
  }

  return undefined;
}

export function cleanMerchant(input: string) {
  return input
    .replace(/pg\s*\*/i, "")
    .replace(/\s+-\s+parcela\s+\d+\s*\/\s*\d+/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

export function makeRefundMatchKey(input: string) {
  const normalized = normalize(input)
    .replace(/\bestorno\b/g, "")
    .replace(/\breembolso\b/g, "")
    .replace(/\bdevolucao\b/g, "")
    .replace(/\bpg\b/g, "")
    .replace(/\*/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);

  return crypto.createHash("sha1").update(normalized || input || "refund").digest("hex");
}

export function makePurchaseMatchKey(input?: string | null) {
  return makeRefundMatchKey(input || "");
}
