import { NextResponse } from "next/server";
import { getApiUserFromRequest, unauthorized } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase";
import { bankKeyFromBankName } from "@/lib/accounts";

function parseType(input: any): "debit" | "credit" | "transfer" {
  const value = String(input || "").trim().toLowerCase();
  if (value === "credit" || value === "receita") return "credit";
  if (value === "transfer" || value === "transferencia" || value === "transferência") return "transfer";
  return "debit";
}

function signedAmount(type: "debit" | "credit" | "transfer", amount: number) {
  if (type === "credit") return Math.abs(amount);
  if (type === "debit") return -Math.abs(amount);
  return amount;
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
  const isConsolidated = body.is_consolidated !== false;
  const note = String(body.note || "").trim();

  if (!accountId || !description || !Number.isFinite(amount) || amount === 0) {
    return NextResponse.json({ error: "Dados inválidos para a transação." }, { status: 400 });
  }

  const account = await getAccount(user.id, accountId);
  if (!account?.id) return NextResponse.json({ error: "Conta inválida." }, { status: 400 });

  const bankName = await getBankName(user.id, account.bank_id, account.institution_name);
  const bankKey = bankKeyFromBankName(bankName);

  if (type === "transfer") {
    if (!destinationAccountId || destinationAccountId === accountId) {
      return NextResponse.json({ error: "Informe contas de origem e destino diferentes." }, { status: 400 });
    }

    const destinationAccount = await getAccount(user.id, destinationAccountId);
    if (!destinationAccount?.id) return NextResponse.json({ error: "Conta de destino inválida." }, { status: 400 });

    const destinationBankName = await getBankName(user.id, destinationAccount.bank_id, destinationAccount.institution_name);
    const groupKey = id ? `android-transfer-${id}` : `android-transfer-${crypto.randomUUID()}`;
    const transferAmount = Math.abs(amount);
    const sharedRaw = {
      source: "android_app",
      note: note || null,
      transfer: {
        originAccountId: accountId,
        destinationAccountId,
      },
    };

    if (id) {
      await supabaseAdmin.from("transactions").delete().eq("profile_id", user.id).eq("installment_group_key", groupKey);
    }

    const { data, error } = await supabaseAdmin
      .from("transactions")
      .insert([
        {
          profile_id: user.id,
          account_id: accountId,
          bank_key: bankKey,
          description,
          amount: -transferAmount,
          posted_at: `${postedAtDate}T12:00:00.000Z`,
          status: isConsolidated ? "posted" : "planned",
          type,
          source_category: "android",
          app_category: "Transferências",
          is_transfer: true,
          is_consolidated: isConsolidated,
          installment_group_key: groupKey,
          raw: { ...sharedRaw, transfer: { ...sharedRaw.transfer, role: "origin" } },
        },
        {
          profile_id: user.id,
          account_id: destinationAccountId,
          bank_key: bankKeyFromBankName(destinationBankName),
          description,
          amount: transferAmount,
          posted_at: `${postedAtDate}T12:00:00.000Z`,
          status: isConsolidated ? "posted" : "planned",
          type,
          source_category: "android",
          app_category: "Transferências",
          is_transfer: true,
          is_consolidated: isConsolidated,
          installment_group_key: groupKey,
          raw: { ...sharedRaw, transfer: { ...sharedRaw.transfer, role: "destination" } },
        },
      ])
      .select("id");

    if (error) throw error;
    return NextResponse.json({ ok: true, ids: (data || []).map((row: any) => row.id) });
  }

  const row = {
    profile_id: user.id,
    account_id: accountId,
    bank_key: bankKey,
    description,
    amount: signedAmount(type, amount),
    posted_at: `${postedAtDate}T12:00:00.000Z`,
    status: isConsolidated ? "posted" : "planned",
    type,
    source_category: "android",
    app_category: category,
    app_subcategory: null,
    is_transfer: false,
    is_consolidated: isConsolidated,
    raw: { source: "android_app", note: note || null },
  };

  const query = id
    ? supabaseAdmin.from("transactions").update(row).eq("profile_id", user.id).eq("id", id).select("id").single()
    : supabaseAdmin.from("transactions").insert(row).select("id").single();

  const { data, error } = await query;
  if (error) throw error;

  return NextResponse.json({ ok: true, id: data?.id });
}
