import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getApiUserFromCookiesOrRequest, unauthorized } from "@/lib/auth-server";
import { bankKeyFromBankName } from "@/lib/accounts";

type RepeatMode = "none" | "installment" | "advanced";
type RepeatEvery = "week" | "month" | "year";

function parseAction(input: string) {
  const normalized = input.trim().toLowerCase();
  if (normalized === "receita") return "credit" as const;
  if (normalized === "transferencia" || normalized === "transferÃªncia" || normalized === "transfer") return "transfer" as const;
  return "debit" as const;
}

function computeAmountByAction(type: "credit" | "debit" | "transfer", inputAmount: number) {
  if (type === "credit") return Math.abs(inputAmount);
  if (type === "debit") return -Math.abs(inputAmount);
  return inputAmount;
}

function withError(url: string, code: string) {
  return url.includes("?") ? `${url}&error=${code}` : `${url}?error=${code}`;
}

function safeReturnUrl(input: string) {
  if (input.startsWith("/dashboard")) return input;
  return "/dashboard?tab=transactions";
}

function parseRepeatMode(input: string): RepeatMode {
  const mode = String(input || "").trim().toLowerCase();
  if (mode === "installment" || mode === "parcelamento") return "installment";
  if (mode === "advanced" || mode === "avancado" || mode === "avanÃ§ado") return "advanced";
  return "none";
}

function parseRepeatEvery(input: string): RepeatEvery {
  const value = String(input || "").trim().toLowerCase();
  if (value === "semana" || value === "week" || value === "weekly") return "week";
  if (value === "ano" || value === "year" || value === "yearly") return "year";
  return "month";
}

function parsePositiveInt(input: any, fallback: number) {
  const value = Number(input);
  if (!Number.isFinite(value)) return fallback;
  const rounded = Math.trunc(value);
  if (rounded < 1) return fallback;
  return rounded;
}

function addByRepeat(date: Date, repeatEvery: RepeatEvery, step: number) {
  const next = new Date(date.toISOString());
  if (repeatEvery === "week") {
    next.setUTCDate(next.getUTCDate() + step * 7);
    return next;
  }
  if (repeatEvery === "year") {
    next.setUTCFullYear(next.getUTCFullYear() + step);
    return next;
  }
  next.setUTCMonth(next.getUTCMonth() + step);
  return next;
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function splitAmount(total: number, count: number) {
  const safeCount = Math.max(1, Math.trunc(count));
  const cents = Math.round(Math.abs(total) * 100);
  const base = Math.floor(cents / safeCount);
  const remainder = cents % safeCount;
  const pieces: number[] = [];
  for (let index = 0; index < safeCount; index++) {
    const valueCents = base + (index < remainder ? 1 : 0);
    pieces.push(valueCents / 100);
  }
  return pieces;
}

function appendInstallmentSuffix(description: string, current: number, total: number) {
  const base = String(description || "").trim();
  const cleaned = base.replace(/\s*-\s*\d+\s+de\s+\d+\s*$/i, "").trim();
  return `${cleaned} - ${current} de ${total}`.trim();
}

function appendRecurringSuffix(description: string, index: number) {
  const base = String(description || "").trim();
  if (/recorr/i.test(base)) return base;
  return `${base} - recorrÃªncia #${index}`.trim();
}

function buildRecurringOccurrences(input: {
  mode: RepeatMode;
  description: string;
  postedAtDate: string;
  type: "credit" | "debit" | "transfer";
  baseAmount: number;
  installmentCurrent: number;
  installmentTotal: number;
  installmentTotalAmount: number | null;
  repeatEvery: RepeatEvery;
  repeatForever: boolean;
}) {
  const firstDate = new Date(`${input.postedAtDate}T12:00:00.000Z`);

  if (input.mode === "none") {
    return {
      groupKey: null as string | null,
      isRecurring: false,
      forceUnconsolidated: false,
      items: [
        {
          postedAtDate: input.postedAtDate,
          description: input.description,
          amount: input.baseAmount,
          installmentCurrent: null as number | null,
          installmentTotal: null as number | null,
        },
      ],
      metadata: { mode: "none" },
    };
  }

  const groupKey = `manual-rec-${crypto.randomUUID()}`;

  if (input.mode === "installment") {
    const current = Math.max(1, input.installmentCurrent);
    const total = Math.max(current, input.installmentTotal);
    const fullTotalAbs = Number.isFinite(Number(input.installmentTotalAmount)) && Number(input.installmentTotalAmount) > 0
      ? Number(input.installmentTotalAmount)
      : Math.abs(input.baseAmount) * total;
    const perInstallment = splitAmount(fullTotalAbs, total);
    const startIndex = current - 1;
    const items: Array<{
      postedAtDate: string;
      description: string;
      amount: number;
      installmentCurrent: number;
      installmentTotal: number;
    }> = [];

    for (let installment = current; installment <= total; installment++) {
      const step = installment - current;
      const date = addByRepeat(firstDate, "month", step);
      const signedAmount = computeAmountByAction(typeFromAction(input.type), perInstallment[installment - 1] || perInstallment[startIndex] || 0);
      items.push({
        postedAtDate: toIsoDate(date),
        description: appendInstallmentSuffix(input.description, installment, total),
        amount: signedAmount,
        installmentCurrent: installment,
        installmentTotal: total,
      });
    }

    return {
      groupKey,
      isRecurring: true,
      forceUnconsolidated: true,
      items,
      metadata: {
        mode: "installment",
        repeatEvery: "month",
        repeatForever: false,
      },
    };
  }

  const current = Math.max(1, input.installmentCurrent);
  const total = Math.max(current, input.installmentTotal);
  const horizon = 120;
  const finiteCount = Math.max(1, total - current + 1);
  const totalItems = input.repeatForever ? horizon : finiteCount;

  const items: Array<{
    postedAtDate: string;
    description: string;
    amount: number;
    installmentCurrent: number;
    installmentTotal: number | null;
  }> = [];

  for (let idx = 0; idx < totalItems; idx++) {
    const installment = current + idx;
    const date = addByRepeat(firstDate, input.repeatEvery, idx);
    const description = input.repeatForever
      ? appendRecurringSuffix(input.description, installment)
      : appendInstallmentSuffix(input.description, installment, total);

    items.push({
      postedAtDate: toIsoDate(date),
      description,
      amount: input.baseAmount,
      installmentCurrent: installment,
      installmentTotal: input.repeatForever ? null : total,
    });
  }

  return {
    groupKey,
    isRecurring: true,
    forceUnconsolidated: true,
    items,
    metadata: {
      mode: "advanced",
      repeatEvery: input.repeatEvery,
      repeatForever: input.repeatForever,
      horizon,
    },
  };
}

function typeFromAction(type: "credit" | "debit" | "transfer") {
  return type;
}

export async function POST(req: Request) {
  const user = await getApiUserFromCookiesOrRequest(req);
  if (!user) return unauthorized();

  const form = await req.formData();
  const returnUrl = safeReturnUrl(String(form.get("return_url") || "/dashboard?tab=transactions"));
  const accountId = String(form.get("account_id") || "").trim();
  const description = String(form.get("description") || "").trim();
  const postedAtDate = String(form.get("posted_at") || "").trim();
  const category = String(form.get("category") || "").trim() || "Outros";
  const action = String(form.get("action") || "Despesa");
  const type = parseAction(action);
  const inputAmount = Number(form.get("amount") || 0);
  const repeatMode = parseRepeatMode(String(form.get("repeat_mode") || "none"));
  const repeatEvery = parseRepeatEvery(String(form.get("repeat_every") || "month"));
  const repeatForever = form.has("repeat_forever");
  const installmentCurrent = parsePositiveInt(form.get("installment_current"), 1);
  const installmentTotal = parsePositiveInt(form.get("installment_total"), 1);
  const installmentTotalAmountRaw = Number(form.get("installment_total_amount") || 0);
  const installmentTotalAmount = Number.isFinite(installmentTotalAmountRaw) && installmentTotalAmountRaw > 0
    ? installmentTotalAmountRaw
    : null;
  const isConsolidated = form.has("is_consolidated");

  if (!accountId || !description || !postedAtDate || !Number.isFinite(inputAmount) || inputAmount === 0) {
    return NextResponse.redirect(new URL(withError(returnUrl, "invalid_transaction"), req.url));
  }

  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("id, institution_name, bank_id")
    .eq("id", accountId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!account?.id) {
    return NextResponse.redirect(new URL(withError(returnUrl, "invalid_account"), req.url));
  }

  const { data: bank } = account.bank_id
    ? await supabaseAdmin
      .from("banks")
      .select("name")
      .eq("id", account.bank_id)
      .eq("profile_id", user.id)
      .maybeSingle()
    : { data: null as any };

  const bankName = String(bank?.name || account.institution_name || "GENERICO");
  const baseAmount = computeAmountByAction(type, inputAmount);
  const bankKey = bankKeyFromBankName(bankName);

  const recurrence = buildRecurringOccurrences({
    mode: repeatMode,
    description,
    postedAtDate,
    type,
    baseAmount,
    installmentCurrent,
    installmentTotal,
    installmentTotalAmount,
    repeatEvery,
    repeatForever,
  });

  const rows = recurrence.items.map((item) => ({
    profile_id: user.id,
    account_id: accountId,
    bank_key: bankKey,
    description: item.description,
    amount: item.amount,
    currency_code: "BRL",
    posted_at: `${item.postedAtDate}T12:00:00.000Z`,
    status: recurrence.forceUnconsolidated ? "planned" : (isConsolidated ? "posted" : "planned"),
    type,
    source_category: "manual",
    app_category: category,
    app_subcategory: null,
    is_transfer: type === "transfer",
    is_consolidated: recurrence.forceUnconsolidated ? false : isConsolidated,
    installment_current: item.installmentCurrent,
    installment_total: item.installmentTotal,
    installment_group_key: recurrence.groupKey,
    raw: {
      source: "manual_form",
      recurrence: recurrence.metadata,
    },
  }));

  await supabaseAdmin.from("transactions").insert(rows);

  return NextResponse.redirect(new URL(returnUrl, req.url));
}
