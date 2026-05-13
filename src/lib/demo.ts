import { supabaseAdmin } from "./supabase";
import { monthRef } from "./format";

export async function ensureDemoProfile(profileId: string, email: string) {
  const { error } = await supabaseAdmin.from("profiles").upsert({
    id: profileId,
    email,
    full_name: "Usu\u00e1rio Demo",
  });

  if (error) throw error;
}

export async function seedBudgetsAndGoals(profileId: string) {
  const ref = monthRef();
  const budgets = [
    ["Alimenta\u00e7\u00e3o", 1200],
    ["Casa", 1800],
    ["Transporte", 900],
    ["Sa\u00fade", 400],
    ["Lazer", 500],
  ];

  for (const [category, planned] of budgets) {
    const { error } = await supabaseAdmin.from("budgets").upsert(
      {
        profile_id: profileId,
        month_ref: ref,
        category,
        planned_amount: planned,
      },
      { onConflict: "profile_id,month_ref,category" }
    );

    if (error) throw error;
  }

  const goals = [
    ["Reserva de Emerg\u00eancia", 30000, 8500, "2026-12-31", "Meta principal de seguran\u00e7a"],
    ["Viagem em fam\u00edlia", 10000, 2400, "2026-09-30", "F\u00e9rias anuais"],
  ];

  for (const [name, target_amount, current_amount, target_date, notes] of goals) {
    const { error } = await supabaseAdmin.from("financial_goals").insert({
      profile_id: profileId,
      name,
      target_amount,
      current_amount,
      target_date,
      notes,
    });

    if (error) throw error;
  }
}
