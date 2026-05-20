export type CategoryLeafStats = {
  name: string;
  txCount: number;
  totalAbs: number;
};

export type CategoryGroupStats = {
  name: string;
  txCount: number;
  totalAbs: number;
  leaves: CategoryLeafStats[];
};

const CATEGORY_TEMPLATE: Record<string, string[]> = {
  Moradia: ["Aluguel", "Condominio", "Energia", "Agua", "Internet", "Gas", "IPTU", "Casa"],
  Alimentação: ["Supermercado", "Restaurantes", "Padaria", "Delivery", "Assinaturas"],
  Transporte: ["Combustível", "Transporte", "Mobilidade", "Estacionamento", "Manutenção do Carro"],
  Saúde: ["Farmácia", "Plano de Saúde", "Consulta", "Seguro"],
  Educação: ["Cursos", "Escola", "Livros"],
  Lazer: ["Lazer", "Viagem", "Entretenimento", "Eletrônicos"],
  Compras: ["Vestuário", "Vestimenta", "Mobília-Eletro-Móveis", "Higiene Pessoal", "Sala"],
  Financeiro: ["Taxas", "Juros", "Investimentos", "Transferência", "Transferências"],
  Receitas: ["Receitas", "Salario", "Renda Extra"],
  Outros: ["Outros", "Não classificado"],
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

function isUnknownCategory(value: string) {
  const normalized = normalizeValue(value);
  return !normalized || normalized === "null" || normalized === "undefined";
}

function detectGroup(categoryName: string, leafToGroup: Map<string, string>) {
  const normalized = normalizeValue(categoryName);
  const direct = leafToGroup.get(normalized);
  if (direct) return direct;

  if (/aluguel|condominio|energia|agua|internet|gas|iptu|moradia|casa/.test(normalized)) return "Moradia";
  if (/supermerc|mercado|restaurante|delivery|aliment|padaria/.test(normalized)) return "Alimentação";
  if (/combust|transporte|mobilidade|uber|99|estacion|pedagio|carro/.test(normalized)) return "Transporte";
  if (/farmacia|saude|medic|plano|seguro/.test(normalized)) return "Saúde";
  if (/curso|escola|educa|livro/.test(normalized)) return "Educação";
  if (/lazer|viagem|entretenimento|show|eletron/.test(normalized)) return "Lazer";
  if (/vest|higiene|mobilia|moveis|sala|compras/.test(normalized)) return "Compras";
  if (/taxa|juros|invest|transfer|pix|ted/.test(normalized)) return "Financeiro";
  if (/receita|salario|renda|provento/.test(normalized)) return "Receitas";

  return "Outros";
}

export function buildCategoryGroups(rows: Array<{ app_category?: string | null; amount?: number | null }>): CategoryGroupStats[] {
  const leafToGroup = new Map<string, string>();
  for (const [groupName, leaves] of Object.entries(CATEGORY_TEMPLATE)) {
    for (const leafName of leaves) {
      leafToGroup.set(normalizeValue(leafName), groupName);
    }
  }

  const groupMap = new Map<string, Map<string, CategoryLeafStats>>();

  function ensureLeaf(groupName: string, leafName: string) {
    if (!groupMap.has(groupName)) groupMap.set(groupName, new Map<string, CategoryLeafStats>());
    const leaves = groupMap.get(groupName)!;
    if (!leaves.has(leafName)) leaves.set(leafName, { name: leafName, txCount: 0, totalAbs: 0 });
    return leaves.get(leafName)!;
  }

  for (const [groupName, leaves] of Object.entries(CATEGORY_TEMPLATE)) {
    for (const leafName of leaves) ensureLeaf(groupName, leafName);
  }

  for (const row of rows || []) {
    const rawCategory = String(row.app_category || "").trim();
    const categoryName = isUnknownCategory(rawCategory) ? "Outros" : rawCategory;
    const amount = Math.abs(Number(row.amount || 0));
    const groupName = detectGroup(categoryName, leafToGroup);
    const leaf = ensureLeaf(groupName, categoryName);

    leaf.txCount += 1;
    leaf.totalAbs += amount;
  }

  const groups: CategoryGroupStats[] = Array.from(groupMap.entries()).map(([groupName, leavesMap]) => {
    const leaves = Array.from(leavesMap.values())
      .sort((a, b) => b.txCount - a.txCount || b.totalAbs - a.totalAbs || a.name.localeCompare(b.name, "pt-BR"));

    return {
      name: groupName,
      txCount: leaves.reduce((sum, leaf) => sum + leaf.txCount, 0),
      totalAbs: leaves.reduce((sum, leaf) => sum + leaf.totalAbs, 0),
      leaves,
    };
  });

  return groups.sort((a, b) => {
    const aOutros = a.name === "Outros" ? 1 : 0;
    const bOutros = b.name === "Outros" ? 1 : 0;
    if (aOutros !== bOutros) return aOutros - bOutros;
    return b.txCount - a.txCount || a.name.localeCompare(b.name, "pt-BR");
  });
}
