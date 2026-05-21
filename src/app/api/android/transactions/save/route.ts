import { NextResponse } from "next/server";
import { getApiUserFromRequest, unauthorized } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase";
import { bankKeyFromBankName } from "@/lib/accounts";

type TxType = "debit" | "credit" | "transfer";
type RepeatMode = "none" | "installment" | "advanced";
type RepeatEvery = "week" | "month" | "year";
type RepeatScope = "single" | "from_current" | "from_first";

function parseType(input: any): TxType {
  const value = String(input || "").trim().toLowerCase();
  if (value === "credit" || value === "receita") return "credit";
  if (value === "transfer" || value === "transferencia" || value === "transferência") return "transfer";
  return "debit";
}

function signedAmount(type: TxType, amount: number) {
  if (type === "credit") return Math.abs(amount);
  if (type === "debit") return -Math.abs(amount);
  return amount;
}

function parseRepeatMode(input: any): RepeatMode {
  const mode = String(input || "").trim().toLowerCase();
  if (mode === "installment" || mode === "parcelamento") return "installment";
  if (mode === "advanced" || mode === "avancado" || mode === "avançado") return "advanced";
  return "none";
}

function parseRepeatEvery(input: any): RepeatEvery {
  const value = String(input || "").trim().toLowerCase();
  if (value === "semana" || value === "week" || value === "weekly") return "week";
  if (value === "ano" || value === "year" || value === "yearly") return "year";
  return "month";
}

function parseRepeatScope(input: any): RepeatScope {
  const value = String(input || "").trim().toLowerCase();
  if (value === "from_current" || value === "future" || value === "a_partir_desta") return "from_current";
  if (value === "from_first" || value === "all" || value === "a_partir_da_primeira") return "from_first";
  return "single";
}

function parsePositiveInt(input: any, fallback: number) {
  const value = Number(input);
  if (!Number.isFinite(value)) return fallback;
  const rounded = Math.trunc(value);
  return rounded >= 1 ? rounded : fallback;
}

function daysInUtcMonth(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
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
  for (let index = 0; index < safeCount; index++) pieces.push((base + (index < remainder ? 1 : 0)) / 100);
  return pieces;
}

function stripRecurrenceSuffix(description: string) {
  return String(description || "")
    .replace(/\s*-\s*\d+\s+de\s+\d+\s*$/i, "")
    .replace(/\s*-\s*recorr\w*\s*#\d+\s*$/i, "")
    .trim();
}

function buildOccurrences(input: {
  mode: RepeatMode;
  description: string;
  postedAtDate: string;
  type: TxType;
  baseAmount: number;
  installmentCurrent: number;
  installmentTotal: number;
  installmentTotalAmount: number | null;
  repeatEvery: RepeatEvery;
  repeatForever: boolean;
  groupKey?: string | null;
}) {
  const firstDate = new Date(`${input.postedAtDate}T12:00:00.000Z`);
  const normalizedDescription = stripRecurrenceSuffix(input.description) || input.description;
  if (input.mode === "none") {
    return {
      groupKey: null as string | null,
      forceUnconsolidated: false,
      metadata: { mode: "none" },
      items: [{ postedAtDate: input.postedAtDate, description: input.description, amount: input.baseAmount, installmentCurrent: null as number | null, installmentTotal: null as number | null }],
    };
  }

  const groupKey = input.groupKey || `android-rec-${crypto.randomUUID()}`;
  if (input.mode === "installment") {
    const current = Math.max(1, input.installmentCurrent);
    const total = Math.max(current, input.installmentTotal);
    const remainingCount = Math.max(1, total - current + 1);
    const perInstallment = input.installmentTotalAmount && input.installmentTotalAmount > 0
      ? input.installmentTotalAmount / total
      : Math.abs(input.baseAmount);
    const pieces = splitAmount(perInstallment * remainingCount, remainingCount);
    return {
      groupKey,
      forceUnconsolidated: true,
      metadata: { mode: "installment", repeatEvery: "month", repeatForever: false },
      items: pieces.map((piece, index) => {
        const installment = current + index;
        return {
          postedAtDate: toIsoDate(addByRepeat(firstDate, "month", index)),
          description: `${normalizedDescription} - ${installment} de ${total}`,
          amount: signedAmount(input.type, piece),
          installmentCurrent: installment,
          installmentTotal: total,
        };
      }),
    };
  }

  const current = Math.max(1, input.installmentCurrent);
  const total = Math.max(current, input.installmentTotal);
  const totalItems = input.repeatForever ? 120 : Math.max(1, total - current + 1);
  const items = [];
  for (let index = 0; index < totalItems; index++) {
    const installment = current + index;
    items.push({
      postedAtDate: toIsoDate(addByRepeat(firstDate, input.repeatEvery, index)),
      description: input.repeatForever ? `${normalizedDescription} - recorrente #${installment}` : `${normalizedDescription} - ${installment} de ${total}`,
      amount: input.baseAmount,
      installmentCurrent: installment,
      installmentTotal: input.repeatForever ? null : total,
    });
  }
  return { groupKey, forceUnconsolidated: true, metadata: { mode: "advanced", repeatEvery: input.repeatEvery, repeatForever: input.repeatForever, horizon: 120 }, items };
}

async function getAccount(profileId: string, accountId: string) {
  const { data } = await supabaseAdmin
    .from("accounts")
    .select("id, bank_id, institution_name")
    .eq("profile_id", profileId)
    .eq("id", accountId)
    .maybeSingle();
  return data;
}

async function getBankName(profileId: string, bankId?: string | null, fallback?: string | null) {
  if (!bankId) return fallback || "GENERICO";
  const { data } = await supabaseAdmin
    .from("banks")
    .select("name")
    .eq("profile_id", profileId)
    .eq("id", bankId)
    .maybeSingle();
  return data?.name || fallback || "GENERICO";
}

async function getExistingTransaction(profileId: string, id: string) {
  if (!id) return null;
  const { data } = await supabaseAdmin
    .from("transactions")
    .select("id, posted_at, type, installment_group_key, installment_current, installment_total, is_consolidated")
    .eq("profile_id", profileId)
    .eq("id", id)
    .maybeSingle();
  return data;
}

async function getRecurringTargets(profileId: string, groupKey: string, scope: RepeatScope, selectedPostedAt: string) {
  let query = supabaseAdmin
    .from("transactions")
    .select("id, posted_at, installment_current, installment_total, is_consolidated")
    .eq("profile_id", profileId)
    .eq("installment_group_key", groupKey)
    .eq("is_consolidated", false)
    .order("posted_at", { ascending: true });

  if (scope === "from_current") query = query.gte("posted_at", selectedPostedAt);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function POST(req: Request) {
  const user = await getApiUserFromRequest(req);
  if (!user) return unauthorized();

  const body = await req.json();
  const id = String(body.id || "").trim();
  const accountId = String(body.account_id || body.origin_account_id || "").trim();
  const destinationAccountId = String(body.destination_account_id || "").trim();
  const description = String(body.description || "").replace(/\s+/g, " ").trim();
  const category = String(body.category || "Outros").trim() || "Outros";
  const postedAtDate = String(body.posted_at || new Date().toISOString().slice(0, 10)).slice(0, 10);
  const amount = Number(body.amount || 0);
  const type = parseType(body.type || body.action);
  const repeatScope = parseRepeatScope(body.repeat_scope);
  const repeatMode = parseRepeatMode(body.repeat_mode);
  const repeatEvery = parseRepeatEvery(body.repeat_every);
  const repeatForever = body.repeat_forever === true;
  const installmentCurrent = parsePositiveInt(body.installment_current, 1);
  const installmentTotal = parsePositiveInt(body.installment_total, 1);
  const installmentTotalAmountRaw = Number(body.installment_total_amount || 0);
  const installmentTotalAmount = Number.isFinite(installmentTotalAmountRaw) && installmentTotalAmountRaw > 0 ? installmentTotalAmountRaw : null;
  const isConsolidated = body.is_consolidated !== false;
  const note = String(body.note || "").trim();

  if (!accountId || !description || !Number.isFinite(amount) || amount === 0) {
    return NextResponse.json({ error: "Dados inválidos para a transação." }, { status: 400 });
  }

  const account = await getAccount(user.id, accountId);
  if (!account?.id) return NextResponse.json({ error: "Conta inválida." }, { status: 400 });

  const bankName = await getBankName(user.id, account.bank_id, account.institution_name);
  const bankKey = bankKeyFromBankName(bankName);
  const baseAmount = signedAmount(type, amount);
  const existingTx = await getExistingTransaction(user.id, id);
  const existingGroupKey = String((existingTx as any)?.installment_group_key || "");
  const existingPostedAt = String((existingTx as any)?.posted_at || `${postedAtDate}T12:00:00.000Z`);
  const recurringTargets = id && existingGroupKey && repeatScope !== "single"
    ? await getRecurringTargets(user.id, existingGroupKey, repeatScope, existingPostedAt)
    : [];
  const firstTarget: any = recurringTargets[0] || existingTx || null;
  const occurrencePostedAtDate = repeatScope !== "single" && firstTarget?.posted_at
    ? String(firstTarget.posted_at).slice(0, 10)
    : postedAtDate;
  const occurrenceInstallmentCurrent = repeatScope !== "single" && firstTarget?.installment_current
    ? parsePositiveInt(firstTarget.installment_current, installmentCurrent)
    : installmentCurrent;
  const occurrenceInstallmentTotal = installmentTotal > 1
    ? installmentTotal
    : parsePositiveInt((existingTx as any)?.installment_total, installmentTotal);
  const recurrenceGroupKey = repeatScope !== "single" && existingGroupKey ? existingGroupKey : null;
  const recurrence = buildOccurrences({
    mode: repeatMode,
    description,
    postedAtDate: occurrencePostedAtDate,
    type,
    baseAmount,
    installmentCurrent: occurrenceInstallmentCurrent,
    installmentTotal: occurrenceInstallmentTotal,
    installmentTotalAmount,
    repeatEvery,
    repeatForever,
    groupKey: recurrenceGroupKey,
  });

  if (type === "transfer") {
    if (!destinationAccountId || destinationAccountId === accountId) return NextResponse.json({ error: "Informe contas de origem e destino diferentes." }, { status: 400 });
    const destinationAccount = await getAccount(user.id, destinationAccountId);
    if (!destinationAccount?.id) return NextResponse.json({ error: "Conta de destino inválida." }, { status: 400 });
    const destinationBankName = await getBankName(user.id, destinationAccount.bank_id, destinationAccount.institution_name);
    const groupKey = id ? `android-transfer-${id}` : `android-transfer-${crypto.randomUUID()}`;
    const transferAmount = Math.abs(amount);
    const rows = recurrence.items.flatMap((item) => {
      const itemGroupKey = recurrence.groupKey || groupKey;
      const sharedRaw = { source: "android_app", note: note || null, recurrence: recurrence.metadata, transfer: { originAccountId: accountId, destinationAccountId } };
      return [
        {
          profile_id: user.id,
          account_id: accountId,
          bank_key: bankKey,
          description: item.description,
          amount: -transferAmount,
          posted_at: `${item.postedAtDate}T12:00:00.000Z`,
          status: recurrence.forceUnconsolidated ? "planned" : (isConsolidated ? "posted" : "planned"),
          type,
          source_category: "android",
          app_category: "Transferências",
          app_subcategory: null,
          is_transfer: true,
          is_consolidated: recurrence.forceUnconsolidated ? false : isConsolidated,
          installment_current: item.installmentCurrent,
          installment_total: item.installmentTotal,
          installment_group_key: itemGroupKey,
          raw: { ...sharedRaw, transfer: { ...sharedRaw.transfer, role: "origin" } },
        },
        {
          profile_id: user.id,
          account_id: destinationAccountId,
          bank_key: bankKeyFromBankName(destinationBankName),
          description: item.description,
          amount: transferAmount,
          posted_at: `${item.postedAtDate}T12:00:00.000Z`,
          status: recurrence.forceUnconsolidated ? "planned" : (isConsolidated ? "posted" : "planned"),
          type,
          source_category: "android",
          app_category: "Transferências",
          app_subcategory: null,
          is_transfer: true,
          is_consolidated: recurrence.forceUnconsolidated ? false : isConsolidated,
          installment_current: item.installmentCurrent,
          installment_total: item.installmentTotal,
          installment_group_key: itemGroupKey,
          raw: { ...sharedRaw, transfer: { ...sharedRaw.transfer, role: "destination" } },
        },
      ];
    });
    if (id && repeatScope !== "single" && existingGroupKey && recurringTargets.length) {
      const targetIds = recurringTargets.map((row: any) => row.id).filter(Boolean);
      if (targetIds.length) {
        const { error: deleteError } = await supabaseAdmin.from("transactions").delete().eq("profile_id", user.id).in("id", targetIds);
        if (deleteError) throw deleteError;
      }
    } else if (id) {
      const { error: deleteError } = await supabaseAdmin.from("transactions").delete().eq("profile_id", user.id).eq("id", id);
      if (deleteError) throw deleteError;
    }
    const { data, error } = await supabaseAdmin.from("transactions").insert(rows).select("id");
    if (error) throw error;
    return NextResponse.json({ ok: true, ids: (data || []).map((row: any) => row.id) });
  }

  if (id && repeatScope === "single") {
    const currentForSingle = installmentCurrent || parsePositiveInt((existingTx as any)?.installment_current, 1);
    const totalForSingle = installmentTotal > 1 ? installmentTotal : parsePositiveInt((existingTx as any)?.installment_total, 1);
    const singleDescription = repeatMode !== "none" && totalForSingle > 1
      ? `${stripRecurrenceSuffix(description)} - ${currentForSingle} de ${totalForSingle}`
      : description;
    const singleRow = {
      account_id: accountId,
      bank_key: bankKey,
      description: singleDescription,
      amount: baseAmount,
      posted_at: `${postedAtDate}T12:00:00.000Z`,
      status: isConsolidated ? "posted" : "planned",
      type,
      source_category: "android",
      app_category: category,
      app_subcategory: null,
      is_transfer: false,
      is_consolidated: isConsolidated,
      installment_current: repeatMode === "none" ? null : currentForSingle,
      installment_total: repeatMode === "none" ? null : totalForSingle,
      installment_group_key: repeatMode === "none" ? null : (existingGroupKey || recurrence.groupKey),
      raw: { source: "android_app", recurrence: { mode: repeatMode, repeatEvery, repeatForever }, note: note || null },
    };
    const { data, error } = await supabaseAdmin.from("transactions").update(singleRow).eq("profile_id", user.id).eq("id", id).select("id").single();
    if (error) throw error;
    return NextResponse.json({ ok: true, id: data?.id });
  }

  const rows = recurrence.items.map((item) => ({
    profile_id: user.id,
    account_id: accountId,
    bank_key: bankKey,
    description: item.description,
    amount: item.amount,
    posted_at: `${item.postedAtDate}T12:00:00.000Z`,
    status: recurrence.forceUnconsolidated ? "planned" : (isConsolidated ? "posted" : "planned"),
    type,
    source_category: "android",
    app_category: category,
    app_subcategory: null,
    is_transfer: false,
    is_consolidated: recurrence.forceUnconsolidated ? false : isConsolidated,
    installment_current: item.installmentCurrent,
    installment_total: item.installmentTotal,
    installment_group_key: recurrence.groupKey,
    raw: { source: "android_app", recurrence: recurrence.metadata, note: note || null },
  }));

  if (id && repeatScope !== "single" && existingGroupKey && recurringTargets.length) {
    const targetIds = recurringTargets.map((row: any) => row.id).filter(Boolean);
    if (targetIds.length) {
      const { error: deleteError } = await supabaseAdmin.from("transactions").delete().eq("profile_id", user.id).in("id", targetIds);
      if (deleteError) throw deleteError;
    }
    const { data, error } = await supabaseAdmin.from("transactions").insert(rows).select("id");
    if (error) throw error;
    return NextResponse.json({ ok: true, ids: (data || []).map((row: any) => row.id) });
  }

  if (id && repeatMode === "none") {
    const { data, error } = await supabaseAdmin.from("transactions").update(rows[0]).eq("profile_id", user.id).eq("id", id).select("id").single();
    if (error) throw error;
    return NextResponse.json({ ok: true, id: data?.id });
  }

  if (id) await supabaseAdmin.from("transactions").delete().eq("profile_id", user.id).eq("id", id);
  const { data, error } = await supabaseAdmin.from("transactions").insert(rows).select("id");
  if (error) throw error;
  return NextResponse.json({ ok: true, id: Array.isArray(data) ? data[0]?.id : data?.id });
}
