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
  btg: "BTG",
  c6: "C6",
  inter: "INTER",
  mercado_pago: "MERCADO PAGO",
  picpay: "PICPAY",
  generic: "GENERICO",
};

export function normalize(input?: string | null) {
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
  if (/btg|pactual/.test(s)) return "btg";
  if (/\bc6\b/.test(s)) return "c6";
  if (/inter/.test(s)) return "inter";
  if (/mercado pago/.test(s)) return "mercado_pago";
  if (/picpay/.test(s)) return "picpay";
  return "generic";
}

export async function ensureBankByName(profileId: string, bankName: string) {
  const trimmed = bankName.trim();
  if (!trimmed) throw new Error("Nome do banco obrigatorio.");

  const { data: existing } = await supabaseAdmin
    .from("banks")
    .select("id, name")
    .eq("profile_id", profileId)
    .eq("name", trimmed)
    .maybeSingle();

  if (existing?.id) return existing;

  const { data: created, error } = await supabaseAdmin
    .from("banks")
    .insert({ profile_id: profileId, name: trimmed })
    .select("id, name")
    .single();

  if (error) {
    if (String(error.code) === "23505") {
      const { data: afterConflict } = await supabaseAdmin
        .from("banks")
        .select("id, name")
        .eq("profile_id", profileId)
        .eq("name", trimmed)
        .maybeSingle();

      if (afterConflict?.id) return afterConflict;
    }

    throw error;
  }

  return created;
}

export async function ensureBankForKey(profileId: string, bankKey: BankKey) {
  const label = bankLabelFromKey(bankKey);
  return ensureBankByName(profileId, label);
}

export async function findBestAccountForBank(profileId: string, bankKey: BankKey, preferredType?: InternalAccountType) {
  const targetLabel = bankLabelFromKey(bankKey);

  const [{ data: accounts }, { data: banks }] = await Promise.all([
    supabaseAdmin
      .from("accounts")
      .select("id, bank_id, institution_name, name, type, created_at")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("banks")
      .select("id, name")
      .eq("profile_id", profileId),
  ]);

  if (!accounts?.length) return null;

  const bankById = new Map<string, string>((banks || []).map((b: any) => [String(b.id), String(b.name || "")]));
  const targetNormalized = normalize(targetLabel);

  const byBankIdAndType = accounts.find((account: any) => {
    const bankName = bankById.get(String(account.bank_id || ""));
    return normalize(bankName) === targetNormalized && (!preferredType || account.type === preferredType);
  });

  if (byBankIdAndType) return byBankIdAndType;

  const byLegacyInstitutionNameAndType = accounts.find((account: any) => {
    return normalize(account.institution_name) === targetNormalized && (!preferredType || account.type === preferredType);
  });
  if (byLegacyInstitutionNameAndType) return byLegacyInstitutionNameAndType;

  const byBankId = accounts.find((account: any) => {
    const bankName = bankById.get(String(account.bank_id || ""));
    return normalize(bankName) === targetNormalized;
  });
  if (!preferredType && byBankId) return byBankId;

  const byLegacyInstitutionName = accounts.find((account: any) => normalize(account.institution_name) === targetNormalized);
  if (!preferredType && byLegacyInstitutionName) return byLegacyInstitutionName;

  return null;
}

export async function ensureAccountForBank(profileId: string, bankKey: BankKey, preferredType: InternalAccountType = "CHECKING_ACCOUNT") {
  const bank = await ensureBankForKey(profileId, bankKey);

  const { data: sameBankAccounts } = await supabaseAdmin
    .from("accounts")
    .select("id, type")
    .eq("profile_id", profileId)
    .eq("bank_id", bank.id)
    .order("created_at", { ascending: false });

  const sameTypeAccount = (sameBankAccounts || []).find((account: any) => account.type === preferredType);
  if (sameTypeAccount?.id) return sameTypeAccount.id as string;

  const legacyMatch = await findBestAccountForBank(profileId, bankKey, preferredType);
  if (legacyMatch?.id) {
    await supabaseAdmin
      .from("accounts")
      .update({ bank_id: bank.id, institution_name: bank.name })
      .eq("id", legacyMatch.id)
      .eq("profile_id", profileId);

    return legacyMatch.id as string;
  }

  const accountName = preferredType === "CREDIT_CARD" ? `Cartao ${bank.name}` : `Conta ${bank.name}`;
  const { data: created, error } = await supabaseAdmin
    .from("accounts")
    .insert({
      profile_id: profileId,
      bank_id: bank.id,
      type: preferredType,
      subtype: preferredType,
      name: accountName,
      institution_name: bank.name,
      currency_code: "BRL",
      balance: 0,
      raw: { auto_created: true, reason: "notification_or_import_without_account" },
    })
    .select("id")
    .single();

  if (error) throw error;
  return created?.id as string;
}
