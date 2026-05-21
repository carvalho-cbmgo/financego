import { classifyLocalAI, makeDedupeHash, parseInstallments } from "./finance-intelligence";
import { detectRefund, makePurchaseMatchKey } from "./refund-recognition";

export type BankKey =
  | "nubank"
  | "itau"
  | "bradesco"
  | "santander"
  | "banco_do_brasil"
  | "caixa"
  | "c6"
  | "inter"
  | "mercado_pago"
  | "picpay"
  | "generic";

export type ParsedBankTransaction = {
  bankKey: BankKey;
  amount: number;
  description: string;
  merchant?: string;
  postedAt: string;
  type: "debit" | "credit" | "transfer" | "unknown";
  category: string;
  subcategory: string;
  confidence: number;
  installmentCurrent?: number;
  installmentTotal?: number;
  installmentGroupKey?: string;
  source: "notification" | "statement";
  sourceId?: string;
  dedupeHash?: string;
  isRefund?: boolean;
  refundStatus?: "none" | "refund";
  refundMatchKey?: string;
  originalRefundMerchant?: string;
};

function ensureKnownType(type: ParsedBankTransaction["type"] | null | undefined): "debit" | "credit" | "transfer" {
  if (type === "credit" || type === "debit" || type === "transfer") return type;
  // Regra de fallback: na duvida, usa despesa.
  return "debit";
}

function normalize(input?: string | null) {
  return (input || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function looksSamePerson(candidate: string | null | undefined, fullName: string | null | undefined) {
  const normalizedCandidate = normalize(candidate);
  const normalizedFullName = normalize(fullName);
  if (!normalizedCandidate || !normalizedFullName) return false;

  if (normalizedCandidate === normalizedFullName) return true;
  if (normalizedCandidate.includes(normalizedFullName) || normalizedFullName.includes(normalizedCandidate)) return true;

  const candidateParts = normalizedCandidate.split(" ").filter((part) => part.length > 2);
  const nameParts = normalizedFullName.split(" ").filter((part) => part.length > 2);
  if (candidateParts.length < 2 || nameParts.length < 2) return false;

  const matches = candidateParts.filter((part) => nameParts.includes(part)).length;
  return matches >= Math.min(2, nameParts.length);
}

function extractPixCounterparty(text: string) {
  const patterns = [
    /pix\s+recebido\s+de\s+([^|.,;]+)/i,
    /recebido\s+de\s+([^|.,;]+)/i,
    /pix\s+(?:enviado|realizado|feito)\s+para\s+([^|.,;]+)/i,
    /(?:enviado|realizado|feito)\s+para\s+([^|.,;]+)/i,
    /transfer[eê]ncia\s+para\s+([^|.,;]+)/i,
    /transfer[eê]ncia\s+de\s+([^|.,;]+)/i,
    /\bde\s+([A-ZÀ-Ú][A-ZÀ-Úa-zà-ú\s]{4,60})/i,
    /\bpara\s+([A-ZÀ-Ú][A-ZÀ-Úa-zà-ú\s]{4,60})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    const value = match?.[1]?.replace(/\s+/g, " ").trim();
    if (value) return value.slice(0, 70);
  }

  return "";
}

function buildShortNotificationDescription(input: {
  type: "debit" | "credit" | "transfer";
  normalizedText: string;
  rawText: string;
  counterparty: string;
}) {
  const suffix = input.counterparty ? ` - ${input.counterparty}` : "";

  if (/estorno|reembolso/.test(input.normalizedText)) return `Estorno${suffix}`;
  if (input.type === "transfer") return `Transferência${suffix}`;
  if (input.type === "credit") return `PIX Recebido${suffix}`;
  if (/pix|transferencia|transfer[eê]ncia/.test(input.normalizedText)) return `PIX realizado${suffix}`;
  if (/compra.*credito|credito.*aprovad|cartao.*credito/.test(input.normalizedText)) {
    const merchantFromText = input.rawText.match(/\bem\s+([^|.,;]+)/i)?.[1]?.replace(/\s+/g, " ").trim();
    return merchantFromText ? `Compra - ${merchantFromText.slice(0, 60)}` : "Compra no crédito";
  }

  const merchant = extractMerchant(input.rawText);
  return merchant ? `Compra - ${merchant}` : "Despesa registrada";
}

function parseMoneyBR(input: string): number | null {
  const withCurrency = input.match(
    /(?:R\$|\brs\$?)\s*(-?\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})|-?\d{1,3}(?:,\d{3})*(?:\.\d{2})|-?\d+[.,]\d{2}|-?\d+)/i
  );
  if (withCurrency?.[1]) {
    const parsed = parseFlexibleMoneyToken(withCurrency[1]);
    if (parsed !== null) return parsed;
  }

  const decimalOnly = input.match(
    /(-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d{1,3}(?:,\d{3})*\.\d{2}|-?\d+[.,]\d{2})/
  );
  if (decimalOnly?.[1]) {
    return parseFlexibleMoneyToken(decimalOnly[1]);
  }

  return null;
}

function parseFlexibleMoneyToken(raw: string): number | null {
  const token = String(raw || "").trim().replace(/\s+/g, "");
  if (!token) return null;

  const hasComma = token.includes(",");
  const hasDot = token.includes(".");

  let normalized = token;
  if (hasComma && hasDot) {
    // 1.234,56 -> remove thousand separators and use decimal dot
    if (token.lastIndexOf(",") > token.lastIndexOf(".")) {
      normalized = token.replace(/\./g, "").replace(",", ".");
    } else {
      // 1,234.56 -> remove thousand separators and keep decimal dot
      normalized = token.replace(/,/g, "");
    }
  } else if (hasComma) {
    normalized = token.replace(/\./g, "").replace(",", ".");
  } else {
    normalized = token.replace(/,/g, "");
  }

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function parseDateBR(input: string, fallbackYear = new Date().getFullYear()) {
  const m = input.match(/(\d{2})\/(\d{2})(?:\/(\d{2,4}))?/);
  if (!m) return new Date().toISOString();
  const day = m[1];
  const month = m[2];
  let year = m[3] || String(fallbackYear);
  if (year.length === 2) year = `20${year}`;
  return `${year}-${month}-${day}T12:00:00.000Z`;
}

function baseBuild(args: {
  bankKey: BankKey;
  raw: string;
  amount: number;
  postedAt: string;
  type?: ParsedBankTransaction["type"];
  source: "notification" | "statement";
  profileId?: string;
  packageName?: string;
}): ParsedBankTransaction {
  const description = args.raw.replace(/\s+/g, " ").trim().slice(0, 240);
  const ai = classifyLocalAI(description, args.amount);
  const installments = parseInstallments(description);

  const refund = detectRefund(description);
  const merchant = refund.originalMerchant || extractMerchant(description);
  const tx: ParsedBankTransaction = {
    bankKey: args.bankKey,
    amount: args.amount,
    description,
    merchant,
    postedAt: args.postedAt,
    type: ensureKnownType(refund.isRefund ? "credit" : (args.type || guessType(description, args.amount))),
    category: refund.isRefund ? "Estornos" : ai.category,
    subcategory: refund.isRefund ? "Crédito de estorno" : ai.subcategory,
    confidence: refund.isRefund ? 0.99 : ai.confidence,
    installmentCurrent: installments.current,
    installmentTotal: installments.total,
    installmentGroupKey: installments.groupKey,
    source: args.source,
    isRefund: refund.isRefund,
    refundStatus: refund.refundStatus,
    refundMatchKey: refund.isRefund ? refund.refundMatchKey : makePurchaseMatchKey(merchant || description),
    originalRefundMerchant: refund.originalMerchant,
  };

  if (args.profileId) {
    tx.dedupeHash = makeDedupeHash({
      profileId: args.profileId,
      amount: tx.amount,
      description: tx.description,
      merchant: tx.merchant,
      postedAt: tx.postedAt,
      packageName: args.packageName || args.bankKey,
    });
  }

  return tx;
}

function guessType(text: string, amount: number): ParsedBankTransaction["type"] {
  const s = normalize(text);
  if (amount > 0) return "credit";
  if (/pix|transferencia|ted|doc/.test(s)) return "transfer";
  if (/compra|pagamento|debito|cartao|parcela/.test(s)) return "debit";
  return "debit";
}

function extractMerchant(text: string) {
  const cleaned = text
    .replace(/\s+-\s+parcela\s+\d{1,2}\s*\/\s*\d{1,2}/i, "")
    .replace(/\s+parcela\s+\d{1,2}\s*(?:de|\/)\s*\d{1,2}/i, "")
    .replace(/compra\s+(aprovada|realizada)?/i, "")
    .replace(/r\$\s*\d{1,3}(?:\.\d{3})*,\d{2}/i, "")
    .replace(/\d{2}\/\d{2}(?:\/\d{2,4})?/g, "")
    .replace(/cart[aã]o.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.length >= 3 ? cleaned.slice(0, 80) : undefined;
}

export function detectBankFromPackageOrText(input: {
  packageName?: string | null;
  appName?: string | null;
  text?: string | null;
}): BankKey {
  const s = normalize([input.packageName, input.appName, input.text].filter(Boolean).join(" "));

  if (/nu\.production|nubank|nu bank/.test(s)) return "nubank";
  if (/itau|itaucard/.test(s)) return "itau";
  if (/bradesco/.test(s)) return "bradesco";
  if (/santander/.test(s)) return "santander";
  if (/bb\.android|banco do brasil|\bbb\b/.test(s)) return "banco_do_brasil";
  if (/caixa/.test(s)) return "caixa";
  if (/c6bank|c6 bank/.test(s)) return "c6";
  if (/bancointer|inter/.test(s)) return "inter";
  if (/mercadopago|mercado pago/.test(s)) return "mercado_pago";
  if (/picpay/.test(s)) return "picpay";

  return "generic";
}

export function parseNotificationByBank(input: {
  profileId: string;
  packageName?: string | null;
  appName?: string | null;
  title?: string | null;
  text?: string | null;
  bigText?: string | null;
  postedAt?: string | null;
  profileFullName?: string | null;
}): ParsedBankTransaction | null {
  const bankKey = detectBankFromPackageOrText({
    packageName: input.packageName,
    appName: input.appName,
    text: [input.title, input.text, input.bigText].filter(Boolean).join(" "),
  });

  const full = [input.appName, input.title, input.text, input.bigText].filter(Boolean).join(" | ");
  const money = parseMoneyBR(full);
  if (money === null) return null;

  const s = normalize(full);
  let signedAmount = money;
  const counterparty = extractPixCounterparty(full);
  const isOwnCounterparty = looksSamePerson(counterparty, input.profileFullName);
  let forcedType: ParsedBankTransaction["type"] | undefined;
  const looksRefund = /estorno|reembolso|devolucao|devolução/.test(s);
  const looksApprovedCreditPurchase = /compra.*credito|compra.*crédito|credito.*aprovad|crédito.*aprovad|cartao de credito|cartão de crédito|no credito|no crédito/.test(s);

  if (looksRefund) {
    forcedType = "credit";
    signedAmount = Math.abs(money);
  } else if (looksApprovedCreditPurchase || /compra|pagamento aprovado|debito|débito|cartao|cartão|parcela/.test(s)) {
    forcedType = "debit";
    signedAmount = -Math.abs(money);
  } else if (isOwnCounterparty && /pix|transferencia|transfer[eê]ncia|ted|doc/.test(s)) {
    forcedType = "transfer";
    signedAmount = /recebido|credito|deposito|entrada/.test(s) ? Math.abs(money) : -Math.abs(money);
  } else if (/pix recebido|recebido|deposito|depósito|entrada|salario|salário/.test(s)) {
    forcedType = "credit";
    signedAmount = Math.abs(money);
  } else {
    forcedType = /pix|transferencia|transfer[eê]ncia|ted|doc/.test(s) ? "transfer" : "debit";
    signedAmount = -Math.abs(money);
  }

  const parsed = baseBuild({
    bankKey,
    raw: full,
    amount: signedAmount,
    type: forcedType,
    postedAt: input.postedAt || new Date().toISOString(),
    source: "notification",
    profileId: input.profileId,
    packageName: input.packageName || undefined,
  });

  parsed.description = buildShortNotificationDescription({
    type: parsed.type === "credit" || parsed.type === "transfer" ? parsed.type : "debit",
    normalizedText: s,
    rawText: full,
    counterparty,
  });
  parsed.merchant = counterparty || parsed.merchant;
  if (parsed.type === "transfer") {
    parsed.category = "Transferências";
    parsed.subcategory = "Movimentação interna";
  }

  return parsed;
}


export function preprocessStatementTextForPdf(text: string) {
  return text
    .replace(/\u0000/g, "")
    .replace(/([0-9]{2}\/[0-9]{2}(?:\/[0-9]{2,4})?)/g, "\n$1")
    .replace(/(R\$\s*)/g, " R$ ")
    .replace(/\s+/g, " ")
    .replace(/\s+(\d{2}\/\d{2}(?:\/\d{2,4})?)/g, "\n$1")
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

export function parseStatementText(bankKey: BankKey, text: string, profileId: string): ParsedBankTransaction[] {
  const lines = preprocessStatementTextForPdf(text)
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const results: ParsedBankTransaction[] = [];

  for (const line of lines) {
    const tx = parseStatementLine(bankKey, line, profileId);
    if (tx) results.push(tx);
  }

  return results;
}

function parseStatementLine(bankKey: BankKey, line: string, profileId: string): ParsedBankTransaction | null {
  const dateMatch = line.match(/\d{2}\/\d{2}(?:\/\d{2,4})?/);
  if (!dateMatch) return null;

  const moneyMatches = [...line.matchAll(/-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d+,\d{2}/g)];
  if (!moneyMatches.length) return null;

  const lastMoney = moneyMatches[moneyMatches.length - 1][0];
  let amount = parseMoneyBR(lastMoney);
  if (amount === null) return null;

  const s = normalize(line);
  const looksDebit = /compra|pagamento|debito|cartao|parcela|saque|tarifa|pix enviado|transferencia enviada/.test(s);
  const looksCredit = /recebido|deposito|pix recebido|estorno|reembolso|salario/.test(s)
    || (/\bcredito\b/.test(s) && !/compra|cartao|aprovad/.test(s));

  if (looksDebit) amount = -Math.abs(amount);
  else if (looksCredit) amount = Math.abs(amount);
  else if (!String(lastMoney).startsWith("-")) amount = -Math.abs(amount);

  return baseBuild({
    bankKey,
    raw: line,
    amount,
    postedAt: parseDateBR(dateMatch[0]),
    source: "statement",
    profileId,
    packageName: bankKey,
  });
}


export function parseCsvStatement(bankKey: BankKey, csv: string, profileId: string): ParsedBankTransaction[] {
  const rows = parseCsvRows(csv);
  if (rows.length < 2) return parseStatementText(bankKey, csv, profileId);

  const header = rows[0].map((h) => normalize(h));
  const dateIdx = findHeader(header, ["date", "data", "posted_at"]);
  const descIdx = findHeader(header, ["title", "titulo", "descricao", "descrição", "description", "historico", "histórico", "estabelecimento"]);
  const amountIdx = findHeader(header, ["amount", "valor", "vlr"]);

  if (dateIdx < 0 || descIdx < 0 || amountIdx < 0) {
    return parseStatementText(bankKey, csv, profileId);
  }

  if (bankKey === "nubank") {
    return parseNubankCsvRows(rows.slice(1), { dateIdx, descIdx, amountIdx, profileId });
  }

  const results: ParsedBankTransaction[] = [];

  for (const cols of rows.slice(1)) {
    const rawDate = cols[dateIdx] || "";
    const rawDescription = cols[descIdx] || "";
    const rawAmount = cols[amountIdx] || "";
    const cleanedDescription = sanitizeCsvDescription(rawDescription);
    const amount = parseFlexibleMoney(rawAmount);
    if (amount === null) continue;

    const rawNormalized = normalize(rawDescription);
    const isIncomeDescription = /receb|deposito|pix recebido|salario|estorno|reembolso/.test(rawNormalized);
    const isDebitDescription = /compra|pagamento|debito|cartao|parcela|credito.*aprovad/.test(rawNormalized);
    const signedAmount = isIncomeDescription
      ? Math.abs(amount)
      : isDebitDescription || amount > 0
        ? -Math.abs(amount)
        : amount;

    results.push(baseBuild({
      bankKey,
      raw: cleanedDescription || rawDescription.trim(),
      amount: signedAmount,
      postedAt: parseFlexibleDate(rawDate),
      source: "statement",
      profileId,
      packageName: bankKey,
    }));
  }

  return results;
}

function parseNubankCsvRows(
  rows: string[][],
  indexes: { dateIdx: number; descIdx: number; amountIdx: number; profileId: string }
): ParsedBankTransaction[] {
  const results: ParsedBankTransaction[] = [];

  for (const cols of rows) {
    const date = (cols[indexes.dateIdx] || "").trim();
    const title = (cols[indexes.descIdx] || "").trim();
    const amountRaw = (cols[indexes.amountIdx] || "").trim();
    const cleanedDescription = sanitizeCsvDescription(title);

    if (!date || !title || !amountRaw) continue;

    const nubankAmount = parseFlexibleMoney(amountRaw);
    if (nubankAmount === null) continue;

    const appAmount = convertNubankAmountToAppConvention(nubankAmount, title);
    const type = classifyNubankType(title, nubankAmount);

    results.push(baseBuild({
      bankKey: "nubank",
      raw: cleanedDescription || title,
      amount: appAmount,
      postedAt: parseFlexibleDate(date),
      type,
      source: "statement",
      profileId: indexes.profileId,
      packageName: "nubank",
    }));
  }

  return results;
}

function convertNubankAmountToAppConvention(amount: number, title: string) {
  // No CSV da fatura Nubank:
  // positivo = despesa lançada na fatura;
  // negativo = pagamento/estorno/crédito/desconto.
  if (amount > 0) return -Math.abs(amount);
  if (amount < 0) return Math.abs(amount);
  return 0;
}

function classifyNubankType(title: string, originalAmount: number): ParsedBankTransaction["type"] {
  const s = normalize(title);

  if (originalAmount < 0) {
    if (/pagamento recebido|pagamento/.test(s)) return "credit";
    if (/estorno|reembolso|volta|desconto/.test(s)) return "credit";
    return "credit";
  }

  if (/pix|transferencia|transferência/.test(s)) return "transfer";
  return "debit";
}

function parseFlexibleMoney(input: string): number | null {
  const clean = input.trim().replace(/^"|"$/g, "");

  if (/^-?\d+(\.\d{1,2})$/.test(clean)) {
    const n = Number(clean);
    return Number.isFinite(n) ? n : null;
  }

  return parseMoneyBR(clean);
}

function parseFlexibleDate(input: string) {
  const clean = input.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return `${clean}T12:00:00.000Z`;
  }

  return parseDateBR(clean);
}

function sanitizeCsvDescription(input: string) {
  let description = input
    .trim()
    .replace(/^"+|"+$/g, "")
    .replace(/\s+/g, " ");

  // Remove data no inicio da descricao (YYYY-MM-DD ou DD/MM/YYYY).
  description = description
    .replace(/^\d{4}-\d{2}-\d{2}\s+/, "")
    .replace(/^\d{2}\/\d{2}(?:\/\d{2,4})?\s+/, "");

  // Remove valor no fim da descricao (ex.: 147.75, 1.234,56, R$ 99,90).
  description = description.replace(
    /\s+(?:[-–—]\s*)?(?:R\$\s*)?-?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})\s*$/,
    ""
  );

  return description.replace(/\s+/g, " ").trim();
}

function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    const next = csv[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      i++;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if ((char === "," || char === ";") && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i++;
      row.push(field);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);

  return rows;
}

function findHeader(header: string[], candidates: string[]) {
  return header.findIndex((h) => candidates.some((c) => h.includes(normalize(c))));
}
