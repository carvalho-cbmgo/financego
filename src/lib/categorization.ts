export type CategorizedTransaction = {
  category: string;
  subcategory: string;
  isTransfer: boolean;
};

const rules = [
  { match: /ifood|restaurante|lanchonete|burger/i, category: "Alimentação", subcategory: "Refeições" },
  { match: /supermercado|mercado|atacad/i, category: "Casa", subcategory: "Supermercado" },
  { match: /posto|combust|shell|petrobras|ipiranga/i, category: "Transporte", subcategory: "Combustível" },
  { match: /uber|99app|taxi/i, category: "Transporte", subcategory: "Mobilidade" },
  { match: /farmacia|drogaria/i, category: "Saúde", subcategory: "Farmácia" },
  { match: /pix recebido|salario|pagamento|subsídio|provento/i, category: "Receitas", subcategory: "Entrada" },
  { match: /pix enviado|ted enviada|transferencia enviada/i, category: "Transferências", subcategory: "Saída", isTransfer: true },
  { match: /pix recebido|ted recebida|transferencia recebida/i, category: "Transferências", subcategory: "Entrada", isTransfer: true },
];

export function categorize(text: string): CategorizedTransaction {
  for (const rule of rules) {
    if (rule.match.test(text || "")) {
      return { category: rule.category, subcategory: rule.subcategory, isTransfer: !!rule.isTransfer };
    }
  }
  return { category: "Outros", subcategory: "Não classificado", isTransfer: false };
}
