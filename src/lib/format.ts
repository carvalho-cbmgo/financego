export function brl(value: number | string | null | undefined) {
  const amount = Number(value || 0);
  return amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function shortDate(input?: string | null) {
  if (!input) return "-";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(input));
}

export function monthRef(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
