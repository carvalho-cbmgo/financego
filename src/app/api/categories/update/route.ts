import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getApiUserFromCookiesOrRequest, unauthorized } from "@/lib/auth-server";
import { bankKeyFromBankName } from "@/lib/accounts";

type RepeatMode = "none" | "installment" | "advanced";
type RepeatEvery = "week" | "month" | "year";

function typeFromAction(action: string) {
  const normalized = action.trim().toLowerCase();

  if (normalized === "receita" || normalized === "credit") return "credit" as const;
  if (normalized === "transferencia" || normalized === "transferência" || normalized === "transfer") return "transfer" as const;

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
  if (mode === "advanced" || mode === "avancado" || mode === "avançado") return "advanced";
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
  const baseYear = next.getUTCFullYear();
  const baseMonth = next.getUTCMonth();
  const baseDay = next.getUTCDate();
  const targetMonthOffset = repeatEvery === "year" ? step * 12 : step;
  const totalMonths = baseYear * 12 + baseMonth + targetMonthOffset;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12;
  const targetDay = Math.min(baseDay, daysInUtcMonth(targetYear, targetMonth));
  return new Date(Date.UTC(targetYear, targetMonth, targetDay, 12, 0, 0, 0));
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

function daysInUtcMonth(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function stripRecurrenceSuffix(description: string) {
  const base = String(description || "").trim();
  return base
    .replace(/\s*-\s*\d+\s+de\s+\d+\s*$/i, "")
    .replace(/\s*-\s*recorr\w*\s*#\d+\s*$/i, "")
    .trim();
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
  const normalizedDescription = stripRecurrenceSuffix(input.description) || String(input.description || "").trim();

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
    const remainingCount = Math.max(1, total - current + 1);
    const fullTotalAbs = Number.isFinite(Number(input.installmentTotalAmount)) && Number(input.installmentTotalAmount) > 0
      ? Number(input.installmentTotalAmount)
      : Math.abs(input.baseAmount) * remainingCount;
    const perInstallment = splitAmount(fullTotalAbs, remainingCount);
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
      const idx = installment - current;
      const signedAmount = computeAmountByAction(input.type, perInstallment[idx] || perInstallment[remainingCount - 1] || 0);
      items.push({
        postedAtDate: toIsoDate(date),
        description: normalizedDescription,
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
    const description = normalizedDescription;

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
  const transferDestinationAccountId = String(form.get("transfer_destination_account_id") || "").trim();
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
  const note = String(form.get("note") || "").trim();

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
    if (String(existingTx.installment_group_key || "").startsWith("manual-transfer-")) {
      await supabaseAdmin
        .from("transactions")
        .delete()
        .eq("profile_id", user.id)
        .eq("installment_group_key", existingTx.installment_group_key);

      return NextResponse.redirect(new URL(returnUrl, req.url));
    }

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

  if (txType === "transfer") {
    if (!transferDestinationAccountId || transferDestinationAccountId === accountId) {
      return NextResponse.redirect(new URL("/dashboard?tab=transactions&error=invalid_transfer_accounts", req.url));
    }

    const { data: destinationAccount } = await supabaseAdmin
      .from("accounts")
      .select("id, bank_id, institution_name")
      .eq("id", transferDestinationAccountId)
      .eq("profile_id", user.id)
      .maybeSingle();

    if (!destinationAccount?.id) {
      return NextResponse.redirect(new URL("/dashboard?tab=transactions&error=invalid_transfer_destination", req.url));
    }

    const { data: destinationBank } = destinationAccount.bank_id
      ? await supabaseAdmin
        .from("banks")
        .select("name")
        .eq("id", destinationAccount.bank_id)
        .eq("profile_id", user.id)
        .maybeSingle()
      : { data: null as any };

    const groupKey = String(existingTx.installment_group_key || `manual-transfer-${crypto.randomUUID()}`);
    const transferAmount = Math.abs(inputAmount);
    const sharedRaw = {
      source: "manual_edit",
      recurrence: { mode: "none" },
      note: note || null,
      transfer: {
        originAccountId: accountId,
        destinationAccountId: transferDestinationAccountId,
      },
    };

    await supabaseAdmin
      .from("transactions")
      .delete()
      .eq("profile_id", user.id)
      .eq("installment_group_key", groupKey)
      .neq("id", id);

    await supabaseAdmin
      .from("transactions")
      .update({
        description,
        posted_at: `${postedAtDate}T12:00:00.000Z`,
        bank_key: bankKey,
        amount: -transferAmount,
        app_category: "Transferências",
        app_subcategory: null,
        type: txType,
        is_transfer: true,
        account_id: accountId,
        is_consolidated: isConsolidated,
        status: isConsolidated ? "posted" : "planned",
        installment_current: null,
        installment_total: null,
        installment_group_key: groupKey,
        raw: { ...sharedRaw, transfer: { ...sharedRaw.transfer, role: "origin" } },
      })
      .eq("id", id)
      .eq("profile_id", user.id);

    await supabaseAdmin
      .from("transactions")
      .insert({
        profile_id: user.id,
        account_id: transferDestinationAccountId,
        bank_key: bankKeyFromBankName(String(destinationBank?.name || destinationAccount.institution_name || "GENERICO")),
        description,
        amount: transferAmount,
        currency_code: "BRL",
        posted_at: `${postedAtDate}T12:00:00.000Z`,
        status: isConsolidated ? "posted" : "planned",
        type: txType,
        source_category: "manual",
        app_category: "Transferências",
        app_subcategory: null,
        is_transfer: true,
        is_consolidated: isConsolidated,
        installment_group_key: groupKey,
        raw: { ...sharedRaw, transfer: { ...sharedRaw.transfer, role: "destination" } },
      });

    return NextResponse.redirect(new URL(returnUrl, req.url));
  }

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
        is_transfer: false,
        account_id: accountId,
        is_consolidated: isConsolidated,
        status: isConsolidated ? "posted" : "planned",
        installment_current: null,
        installment_total: null,
        installment_group_key: null,
        raw: {
          source: "manual_edit",
          recurrence: recurrence.metadata,
          note: note || null,
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
      is_transfer: false,
      account_id: accountId,
      is_consolidated: false,
      status: "planned",
      installment_current: first.installmentCurrent,
      installment_total: first.installmentTotal,
      installment_group_key: groupKey,
      raw: {
        source: "manual_edit",
        recurrence: recurrence.metadata,
        note: note || null,
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
    is_transfer: false,
    is_consolidated: false,
    installment_current: item.installmentCurrent,
    installment_total: item.installmentTotal,
    installment_group_key: groupKey,
    raw: {
      source: "manual_edit",
      recurrence: recurrence.metadata,
      note: note || null,
    },
  }));

  if (remaining.length) {
    await supabaseAdmin.from("transactions").insert(remaining);
  }

  return NextResponse.redirect(new URL(returnUrl, req.url));
}

