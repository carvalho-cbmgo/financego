import { supabaseAdmin } from "./supabase";
import type { BankKey } from "./bank-parsers";

export type InternalAccountType = "CHECKING_ACCOUNT" | "CREDIT_CARD";

const BANK_LABEL_BY_KEY: Record<BankKey, string> = {
  nubank: "NUBANK",
  itau: "ITAU",
  bradesco: "BRADESCO",
  santander: "SANTANDER",
  banco_do_brasil: "BANCO DO BRASIL",
  caixa: "CAIXA",
  c6: "C6",
  inter: "INTER",
  mercado_pago: "MERCADO PAGO",
  picpay: "PICPAY",
  generic: "GENERICO",
};

function normalize(input?: string | null) {
  return (input || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function bankLabelFromKey(bankKey?: BankKey | string | null) {
  if (!bankKey) return "GENERICO";
  const key = String(bankKey) as BankKey;
  return BANK_LABEL_BY_KEY[key] || String(bankKey).toUpperCase();
}

export function accountTypeLabel(type?: string | null) {
  if (type === "CREDIT_CARD") return "CARTAO_DE_CREDITO";
  return "CONTA_CORRENTE";
}

export function parseAccountType(input?: string | null): InternalAccountType {
  const s = normalize(input);
  if (s.includes("cartao") || s.includes("credito") || s.includes("credit card")) return "CREDIT_CARD";
  return "CHECKING_ACCOUNT";
}

export function bankKeyFromBankName(bankName?: string | null): BankKey {
  const s = normalize(bankName);
  if (/nubank/.test(s)) return "nubank";
  if (/itau/.test(s)) return "itau";
  if (/bradesco/.test(s)) return "bradesco";
  if (/santander/.test(s)) return "santander";
  if (/banco do brasil|\bbb\b/.test(s)) return "banco_do_brasil";
  if (/caixa/.test(s)) return "caixa";
  if (/\bc6\b/.test(s)) return "c6";
  if (/inter/.test(s)) return "inter";
  if (/mercado pago/.test(s)) return "mercado_pago";
  if (/picpay/.test(s)) return "picpay";
  return "generic";
}

export async function findBestAccountForBank(profileId: string, bankKey: BankKey) {
  const wantedBank = normalize(bankLabelFromKey(bankKey));
  const { data: accounts } = await supabaseAdmin
    .from("accounts")
    .select("id, institution_name, name, type, created_at")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });

  if (!accounts?.length) return null;

  const exact = accounts.find((a: any) => normalize(a.institution_name) === wantedBank);
  if (exact) return exact;

  const fuzzy = accounts.find((a: any) => normalize(a.institution_name).includes(wantedBank) || wantedBank.includes(normalize(a.institution_name)));
  if (fuzzy) return fuzzy;

  return null;
}

export async function ensureAccountForBank(profileId: string, bankKey: BankKey, preferredType: InternalAccountType = "CHECKING_ACCOUNT") {
  const found = await findBestAccountForBank(profileId, bankKey);
  if (found?.id) return found.id as string;

  const bankLabel = bankLabelFromKey(bankKey);
  const accountName = preferredType === "CREDIT_CARD" ? `Cartao ${bankLabel}` : `Conta ${bankLabel}`;

  const { data: created, error } = await supabaseAdmin
    .from("accounts")
    .insert({
      profile_id: profileId,
      type: preferredType,
      subtype: preferredType,
      name: accountName,
      institution_name: bankLabel,
      currency_code: "BRL",
      balance: 0,
      raw: { auto_created: true, reason: "notification_or_import_without_account" },
    })
    .select("id")
    .single();

  if (error) throw error;
  return created?.id as string;
}
