export const ROOT_CATEGORY_NAME = "Raiz";

export function cleanCategoryName(input?: string | null) {
  return String(input || "").trim();
}

export function normalizeCategoryName(input?: string | null) {
  const value = cleanCategoryName(input);
  if (!value) return "Outros";
  return value;
}

export function toCategorySet(values: Array<string | null | undefined>) {
  const set = new Set<string>();
  for (const item of values) {
    const normalized = normalizeCategoryName(item);
    if (!normalized) continue;
    set.add(normalized);
  }
  return set;
}
