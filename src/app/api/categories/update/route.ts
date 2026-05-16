import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getApiUserFromCookiesOrRequest, unauthorized } from "@/lib/auth-server";
import { bankKeyFromBankName } from "@/lib/accounts";

type RepeatMode = "none" | "installment" | "advanced";
type RepeatEvery = "week" | "month" | "year";

function typeFromAction(action: string) {
  const normalized = action.trim().toLowerCase();

  if (normalized === "receita" || normalized === "credit") return "credit" as const;
  if (normalized === "transferencia" || normalized === "transferÃªncia" || normalized === "transfer") return "transfer" as const;

  return "debit" as const;
}

function computeAmountByAction(type: "credit" | "debit" | "transfer", inputAmount: number) {
  if (type === "credit") return Math.abs(inputAmount);
  if (type === "debit") return -Math.abs(inputAmount);
  return inputAmount;
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
      const signedAmount = computeAmountByAction(input.type, perInstallment[installment - 1] || perInstallment[startIndex] || 0);
      items.push({
        postedAtDate: toIsoDate(date),
        description: appendInstallmentSuffix(input.description, installment, total),
        amount: signedAmount,
        installmentCurrent: installment,
        installmentTotal: total,
      });
    }

    return {
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

export async function POST(req: Request) {
  const user = await getApiUserFromCookiesOrRequest(req);
  if (!user) return unauthorized();

  const form = await req.formData();
  const id = String(form.get("id") || "").trim();
  const category = String(form.get("category") || "Outros").trim() || "Outros";
  const description = String(form.get("description") || "").trim();
  const postedAtDate = String(form.get("posted_at") || "").trim();
  const bankId = String(form.get("bank_id") || "").trim();
  const action = String(form.get("action") || "");
  const accountId = String(form.get("account_id") || "").trim();
  const inputAmount = Number(form.get("amount") || 0);
  const returnUrl = safeReturnUrl(String(form.get("return_url") || ""));
  const intent = String(form.get("intent") || "save").trim().toLowerCase();
  const deleteScope = String(form.get("delete_scope") || "single").trim().toLowerCase();
  const isConsolidated = form.has("is_consolidated");
  const txType = typeFromAction(action);
  const baseAmount = computeAmountByAction(txType, inputAmount);

  const repeatMode = parseRepeatMode(String(form.get("repeat_mode") || "none"));
  const repeatEvery = parseRepeatEvery(String(form.get("repeat_every") || "month"));
  const repeatForever = form.has("repeat_forever");
  const installmentCurrent = parsePositiveInt(form.get("installment_current"), 1);
  const installmentTotal = parsePositiveInt(form.get("installment_total"), 1);
  const installmentTotalAmountRaw = Number(form.get("installment_total_amount") || 0);
  const installmentTotalAmount = Number.isFinite(installmentTotalAmountRaw) && installmentTotalAmountRaw > 0
    ? installmentTotalAmountRaw
    : null;

  if (!id) {
    return NextResponse.redirect(new URL(returnUrl, req.url));
  }

  const { data: existingTx } = await supabaseAdmin
    .from("transactions")
    .select("id, profile_id, installment_group_key, posted_at")
    .eq("id", id)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!existingTx?.id) {
    return NextResponse.redirect(new URL("/dashboard?tab=transactions&error=invalid_transaction", req.url));
  }

  if (intent === "delete") {
    if (!existingTx.installment_group_key || deleteScope === "single") {
      await supabaseAdmin
        .from("transactions")
        .delete()
        .eq("id", id)
        .eq("profile_id", user.id);

      return NextResponse.redirect(new URL(returnUrl, req.url));
    }

    const { data: siblings } = await supabaseAdmin
      .from("transactions")
      .select("id, posted_at")
      .eq("profile_id", user.id)
      .eq("installment_group_key", existingTx.installment_group_key);

    const currentPostedAt = String(existingTx.posted_at || "");
    const targets = (siblings || []).filter((row: any) => {
      const postedAt = String(row.posted_at || "");
      if (deleteScope === "up_to_current") return postedAt <= currentPostedAt;
      if (deleteScope === "from_current") return postedAt >= currentPostedAt;
      return String(row.id) === String(existingTx.id);
    });

    const targetIds = Array.from(new Set(targets.map((row: any) => String(row.id))));
    if (targetIds.length) {
      await supabaseAdmin
        .from("transactions")
        .delete()
        .eq("profile_id", user.id)
        .in("id", targetIds);
    }

    return NextResponse.redirect(new URL(returnUrl, req.url));
  }

  if (!accountId || !description || !postedAtDate || !Number.isFinite(inputAmount) || inputAmount === 0) {
    return NextResponse.redirect(new URL("/dashboard?tab=transactions&error=invalid_transaction", req.url));
  }

  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("id, bank_id, institution_name")
    .eq("id", accountId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!account?.id) {
    return NextResponse.redirect(new URL("/dashboard?tab=transactions&error=invalid_account", req.url));
  }

  if (bankId && String(account.bank_id || "") !== bankId) {
    return NextResponse.redirect(new URL("/dashboard?tab=transactions&error=bank_account_mismatch", req.url));
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
  const bankKey = bankKeyFromBankName(bankName);

  const recurrence = buildRecurringOccurrences({
    mode: repeatMode,
    description,
    postedAtDate,
    type: txType,
    baseAmount,
    installmentCurrent,
    installmentTotal,
    installmentTotalAmount,
    repeatEvery,
    repeatForever,
  });

  if (repeatMode === "none") {
    await supabaseAdmin
      .from("transactions")
      .update({
        description: recurrence.items[0].description,
        posted_at: `${recurrence.items[0].postedAtDate}T12:00:00.000Z`,
        bank_key: bankKey,
        amount: recurrence.items[0].amount,
        app_category: category,
        app_subcategory: null,
        type: txType,
        is_transfer: txType === "transfer",
        account_id: accountId,
        is_consolidated: isConsolidated,
        status: isConsolidated ? "posted" : "planned",
        installment_current: null,
        installment_total: null,
        installment_group_key: null,
        raw: {
          source: "manual_edit",
          recurrence: recurrence.metadata,
        },
      })
      .eq("id", id)
      .eq("profile_id", user.id);

    return NextResponse.redirect(new URL(returnUrl, req.url));
  }

  const groupKey = String(existingTx.installment_group_key || `manual-rec-${crypto.randomUUID()}`);

  await supabaseAdmin
    .from("transactions")
    .delete()
    .eq("profile_id", user.id)
    .eq("installment_group_key", groupKey)
    .neq("id", id);

  const first = recurrence.items[0];
  await supabaseAdmin
    .from("transactions")
    .update({
      description: first.description,
      posted_at: `${first.postedAtDate}T12:00:00.000Z`,
      bank_key: bankKey,
      amount: first.amount,
      app_category: category,
      app_subcategory: null,
      type: txType,
      is_transfer: txType === "transfer",
      account_id: accountId,
      is_consolidated: false,
      status: "planned",
      installment_current: first.installmentCurrent,
      installment_total: first.installmentTotal,
      installment_group_key: groupKey,
      raw: {
        source: "manual_edit",
        recurrence: recurrence.metadata,
      },
    })
    .eq("id", id)
    .eq("profile_id", user.id);

  const remaining = recurrence.items.slice(1).map((item) => ({
    profile_id: user.id,
    account_id: accountId,
    bank_key: bankKey,
    description: item.description,
    amount: item.amount,
    currency_code: "BRL",
    posted_at: `${item.postedAtDate}T12:00:00.000Z`,
    status: "planned",
    type: txType,
    source_category: "manual",
    app_category: category,
    app_subcategory: null,
    is_transfer: txType === "transfer",
    is_consolidated: false,
    installment_current: item.installmentCurrent,
    installment_total: item.installmentTotal,
    installment_group_key: groupKey,
    raw: {
      source: "manual_edit",
      recurrence: recurrence.metadata,
    },
  }));

  if (remaining.length) {
    await supabaseAdmin.from("transactions").insert(remaining);
  }

  return NextResponse.redirect(new URL(returnUrl, req.url));
}
