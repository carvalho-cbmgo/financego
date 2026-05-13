import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { ensureDemoProfile, seedBudgetsAndGoals } from "@/lib/demo";
import { getApiUserFromCookiesOrRequest, unauthorized } from "@/lib/auth-server";

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "true") {
    return NextResponse.json({ error: "Seed demo desabilitado em produção" }, { status: 403 });
  }

  try {
    const user = await getApiUserFromCookiesOrRequest(req);
    if (!user) return unauthorized();

    const profileId = user.id;
    await ensureDemoProfile(profileId, user.email || "demo@example.com");

    let { data: item, error: itemReadError } = await supabaseAdmin
      .from("financial_items")
      .select("id")
      .eq("profile_id", profileId)
      .eq("institution_name", "Banco Demo")
      .maybeSingle();

    if (itemReadError) throw itemReadError;

    if (!item) {
      const { data: createdItem, error: itemCreateError } = await supabaseAdmin
        .from("financial_items")
        .insert({
          profile_id: profileId,
          institution_name: "Banco Demo",
          connector_name: "Demo",
          status: "updated",
          next_sync_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (itemCreateError) throw itemCreateError;
      item = createdItem;
    }

    let { data: conta, error: accountReadError } = await supabaseAdmin
      .from("accounts")
      .select("id")
      .eq("profile_id", profileId)
      .eq("name", "Conta principal")
      .maybeSingle();

    if (accountReadError) throw accountReadError;

    if (!conta) {
      const { data: createdAccount, error: accountCreateError } = await supabaseAdmin
        .from("accounts")
        .insert({
          profile_id: profileId,
          financial_item_id: item?.id,
          type: "BANK",
          subtype: "CHECKING_ACCOUNT",
          name: "Conta principal",
          balance: 12450.35,
          institution_name: "Banco Demo",
          last_balance_at: new Date().toISOString(),
          raw: { demo: true },
        })
        .select("id")
        .single();

      if (accountCreateError) throw accountCreateError;
      conta = createdAccount;
    }

    const txs = [
      ["Salário recebido", 8500.0, "Receitas", "Entrada", "2026-03-05T12:00:00Z"],
      ["Supermercado Central", -420.55, "Casa", "Supermercado", "2026-03-07T12:00:00Z"],
      ["Uber", -38.9, "Transporte", "Mobilidade", "2026-03-08T12:00:00Z"],
      ["iFood", -72.1, "Alimentação", "Refeições", "2026-03-09T12:00:00Z"],
      ["Posto Shell", -250.0, "Transporte", "Combustível", "2026-03-12T12:00:00Z"],
      ["Cinema", -85.0, "Lazer", "Entretenimento", "2026-03-15T12:00:00Z"],
    ];

    for (let i = 0; i < txs.length; i++) {
      const [description, amount, app_category, app_subcategory, posted_at] = txs[i];

      const { error: txUpsertError } = await supabaseAdmin.from("transactions").upsert(
        {
          profile_id: profileId,
          account_id: conta?.id,
          dedupe_hash: `demo-${profileId}-${i + 1}`,
          description,
          amount,
          posted_at,
          app_category,
          app_subcategory,
          source_category: "demo",
          status: "posted",
          currency_code: "BRL",
          raw: { demo: true },
        },
        { onConflict: "profile_id,dedupe_hash" }
      );

      if (txUpsertError) throw txUpsertError;
    }

    await seedBudgetsAndGoals(profileId);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
