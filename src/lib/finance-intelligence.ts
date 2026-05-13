import crypto from "crypto";

export type InstallmentInfo = {
  current?: number;
  total?: number;
  groupKey?: string;
};

export type LocalClassification = {
  category: string;
  subcategory: string;
  confidence: number;
};

export type DedupeInput = {
  profileId: string;
  amount?: number | null;
  description?: string | null;
  merchant?: string | null;
  postedAt?: string | null;
  packageName?: string | null;
  notificationId?: string | null;
};

function normalizeText(input?: string | null) {
  return (input || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dateBucket(input?: string | null) {
  if (!input) return "no-date";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "invalid-date";

  // Janela aproximada por dia. Ajuda a unir notificações duplicadas do mesmo lançamento.
  return d.toISOString().slice(0, 10);
}

function roundedAmount(amount?: number | null) {
  return Number(amount || 0).toFixed(2);
}

export function makeDedupeHash(input: DedupeInput) {
  const basis = [
    input.profileId,
    roundedAmount(input.amount),
    dateBucket(input.postedAt),
    normalizeText(input.merchant || input.description).slice(0, 80),
    normalizeText(input.packageName).slice(0, 50),
  ].join("|");

  return crypto.createHash("sha256").update(basis).digest("hex");
}

export function parseInstallments(text?: string | null): InstallmentInfo {
  const s = normalizeText(text);

  const patterns = [
    /parcela\s*(\d{1,2})\s*(?:de|\/)\s*(\d{1,2})/,
    /(\d{1,2})\s*\/\s*(\d{1,2})/,
    /(\d{1,2})\s*de\s*(\d{1,2})\s*parcelas/,
    /parcelado\s*em\s*(\d{1,2})\s*x/,
    /(\d{1,2})x\s*(?:sem juros|com juros)?/,
  ];

  for (const pattern of patterns) {
    const match = s.match(pattern);
    if (!match) continue;

    if (pattern.source.includes("parcelado")) {
      const total = Number(match[1]);
      if (total > 1) return { total, groupKey: makeInstallmentGroupKey(s) };
    }

    if (pattern.source.includes("(\\d{1,2})x")) {
      const total = Number(match[1]);
      if (total > 1) return { total, groupKey: makeInstallmentGroupKey(s) };
    }

    const current = Number(match[1]);
    const total = Number(match[2]);
    if (total > 1 && current >= 1 && current <= total) {
      return { current, total, groupKey: makeInstallmentGroupKey(s) };
    }
  }

  return {};
}

function makeInstallmentGroupKey(text: string) {
  const cleaned = normalizeText(text)
    .replace(/\d{1,2}\s*(\/|de)\s*\d{1,2}/g, "")
    .replace(/parcela/g, "")
    .replace(/parcelado em \d{1,2}x/g, "")
    .slice(0, 120);

  return crypto.createHash("sha1").update(cleaned).digest("hex");
}

const localRules: Array<{
  weight: number;
  category: string;
  subcategory: string;
  keywords: string[];
}> = [
  { weight: 0.98, category: "Alimentação", subcategory: "Delivery", keywords: ["ifood", "uber eats", "rappi"] },
  { weight: 0.92, category: "Alimentação", subcategory: "Restaurantes", keywords: ["restaurante", "lanchonete", "hamburg", "burger", "pizza", "padaria"] },
  { weight: 0.94, category: "Casa", subcategory: "Supermercado", keywords: ["supermercado", "mercado", "atacadao", "assai", "carrefour", "paodeacucar", "pao de acucar"] },
  { weight: 0.94, category: "Transporte", subcategory: "Combustível", keywords: ["posto", "combustivel", "shell", "ipiranga", "petrobras"] },
  { weight: 0.92, category: "Transporte", subcategory: "Aplicativo", keywords: ["uber", "99app", "taxi"] },
  { weight: 0.92, category: "Saúde", subcategory: "Farmácia", keywords: ["farmacia", "drogaria", "raia", "drogasil", "pacheco"] },
  { weight: 0.9, category: "Moradia", subcategory: "Condomínio", keywords: ["condominio", "administradora", "habitacional"] },
  { weight: 0.9, category: "Moradia", subcategory: "Energia/Água", keywords: ["equatorial", "energia", "saneago", "agua"] },
  { weight: 0.94, category: "Transferências", subcategory: "PIX", keywords: ["pix enviado", "pix recebido", "chave pix", "transferencia"] },
  { weight: 0.98, category: "Receitas", subcategory: "Salário", keywords: ["salario", "subsídio", "subsidio", "provento", "pagamento recebido"] },
  { weight: 0.86, category: "Lazer", subcategory: "Entretenimento", keywords: ["cinema", "netflix", "spotify", "prime video", "disney", "ingresso"] },
];

export function classifyLocalAI(text?: string | null, amount?: number | null): LocalClassification {
  const s = normalizeText(text);
  let best: LocalClassification = {
    category: amount && amount > 0 ? "Receitas" : "Outros",
    subcategory: amount && amount > 0 ? "Entrada" : "Não classificado",
    confidence: amount && amount > 0 ? 0.7 : 0.35,
  };

  for (const rule of localRules) {
    const hits = rule.keywords.filter((kw) => s.includes(normalizeText(kw))).length;
    if (!hits) continue;

    const confidence = Math.min(0.99, rule.weight + Math.min(0.06, hits * 0.02));
    if (confidence > best.confidence) {
      best = { category: rule.category, subcategory: rule.subcategory, confidence };
    }
  }

  return best;
}
