export type ParsedNotification = {
  ok: boolean;
  amount?: number;
  description?: string;
  merchant?: string;
  type?: "debit" | "credit" | "transfer" | "unknown";
  category?: string;
  subcategory?: string;
  ignoredReason?: string;
};

function parseBrazilianMoney(input: string): number | null {
  const match = input.match(/(?:R\$|\brs\$?)\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2}|[0-9]+,[0-9]{2})/i);
  if (!match) return null;
  const normalized = match[1].replace(/\./g, "").replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function guessType(text: string): ParsedNotification["type"] {
  const s = text.toLowerCase();

  if (/compra|d[eé]bito|cart[aã]o|pagamento efetuado|você pagou|voce pagou|sa[ií]da|pix enviado|transfer[eê]ncia enviada/.test(s)) {
    return "debit";
  }

  if (/recebido|cr[eé]dito|dep[oó]sito|pix recebido|transfer[eê]ncia recebida|entrada/.test(s)) {
    return "credit";
  }

  if (/transfer[eê]ncia|pix/.test(s)) {
    return "transfer";
  }

  return "unknown";
}

function extractMerchant(text: string): string | undefined {
  const patterns = [
    /em\s+([A-ZÀ-Ú0-9][A-ZÀ-Ú0-9\s\.\-&]{2,40})/i,
    /no\s+([A-ZÀ-Ú0-9][A-ZÀ-Ú0-9\s\.\-&]{2,40})/i,
    /para\s+([A-ZÀ-Ú0-9][A-ZÀ-Ú0-9\s\.\-&]{2,40})/i,
    /recebido de\s+([A-ZÀ-Ú0-9][A-ZÀ-Ú0-9\s\.\-&]{2,40})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].replace(/\s+/g, " ").trim();
  }

  return undefined;
}

function categorize(text: string) {
  const s = text.toLowerCase();
  if (/ifood|restaurante|lanchonete|burger|pizza|hamburg/.test(s)) return ["Alimentação", "Refeições"];
  if (/supermercado|mercado|atacad|assai|atacadão|carrefour/.test(s)) return ["Casa", "Supermercado"];
  if (/posto|combust|shell|petrobras|ipiranga/.test(s)) return ["Transporte", "Combustível"];
  if (/uber|99app|taxi/.test(s)) return ["Transporte", "Mobilidade"];
  if (/farmacia|drogaria/.test(s)) return ["Saúde", "Farmácia"];
  if (/sal[aá]rio|provento|subs[ií]dio|pix recebido|recebido/.test(s)) return ["Receitas", "Entrada"];
  if (/pix|transfer[eê]ncia/.test(s)) return ["Transferências", "Pix/Transferência"];
  return ["Outros", "Não classificado"];
}

export function parseBankNotification(input: {
  appName?: string;
  packageName?: string;
  title?: string;
  text?: string;
  bigText?: string;
}): ParsedNotification {
  const joined = [input.appName, input.title, input.text, input.bigText].filter(Boolean).join(" | ");
  const normalized = joined.replace(/\s+/g, " ").trim();

  if (!normalized) return { ok: false, ignoredReason: "notificacao_vazia" };

  const money = parseBrazilianMoney(normalized);
  if (money === null) return { ok: false, ignoredReason: "sem_valor_monetario" };

  const type = guessType(normalized);
  const signedAmount = type === "credit" ? Math.abs(money) : -Math.abs(money);
  const [category, subcategory] = categorize(normalized);

  return {
    ok: true,
    amount: signedAmount,
    description: normalized.slice(0, 240),
    merchant: extractMerchant(normalized),
    type,
    category,
    subcategory,
  };
}
