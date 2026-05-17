import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getApiUserFromCookiesOrRequest, unauthorized } from "@/lib/auth-server";
import { monthRef as currentMonthRef } from "@/lib/format";

export async function POST(req: Request) {
  const user = await getApiUserFromCookiesOrRequest(req);
  if (!user) return unauthorized();

  const form = await req.formData();
  const monthRef = String(form.get("month_ref") || "").trim();
  const returnUrl = safeReturnUrl(String(form.get("return_url") || ""));

  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthRef)) {
    return NextResponse.redirect(new URL(withStatus(returnUrl || "/budgets", "error", "invalid_month_ref"), req.url));
  }

  const categories = form.getAll("category").map((value) => String(value || "").trim());
  const plannedAmounts = form.getAll("planned_amount").map((value) => parseMoney(value));

  const budgetMap = new Map<string, number>();
  for (let index = 0; index < categories.length; index++) {
    const category = categories[index];
    if (!category) continue;
    const amount = Math.max(0, plannedAmounts[index] || 0);
    budgetMap.set(category, amount);
  }

  const selectedCategories = Array.from(budgetMap.keys());
  const monthsToSync = buildMonthsToSync(monthRef, currentMonthRef());

  const { data: existingRows, error: existingError } = await supabaseAdmin
    .from("budgets")
    .select("id, category, month_ref")
    .eq("profile_id", user.id)
    .in("month_ref", monthsToSync);

  if (existingError) {
    return NextResponse.redirect(new URL(withStatus(returnUrl || `/budgets?month_ref=${monthRef}`, "error", "save_failed"), req.url));
  }

  const rowsToDelete = (existingRows || []).filter((row: any) => !budgetMap.has(String(row.category || "").trim()));
  const deleteIds = rowsToDelete.map((row: any) => String(row.id || "")).filter(Boolean);

  if (deleteIds.length) {
    const { error: deleteError } = await supabaseAdmin
      .from("budgets")
      .delete()
      .eq("profile_id", user.id)
      .in("id", deleteIds);

    if (deleteError) {
      return NextResponse.redirect(new URL(withStatus(returnUrl || `/budgets?month_ref=${monthRef}`, "error", "save_failed"), req.url));
    }
  }

  if (selectedCategories.length) {
    const rowsToUpsert = monthsToSync.flatMap((targetMonthRef) => selectedCategories.map((category) => ({
      profile_id: user.id,
      month_ref: targetMonthRef,
      category,
      planned_amount: Number((budgetMap.get(category) || 0).toFixed(2)),
    })));

    const { error: upsertError } = await supabaseAdmin
      .from("budgets")
      .upsert(rowsToUpsert, { onConflict: "profile_id,month_ref,category" });

    if (upsertError) {
      return NextResponse.redirect(new URL(withStatus(returnUrl || `/budgets?month_ref=${monthRef}`, "error", "save_failed"), req.url));
    }
  }

  const successUrl = returnUrl || `/budgets?month_ref=${encodeURIComponent(monthRef)}`;
  const okCode = monthsToSync.length > 1 ? "saved_replicated" : "saved";
  return NextResponse.redirect(new URL(withStatus(successUrl, "ok", okCode), req.url));
}

function parseMoney(input: FormDataEntryValue) {
  const normalized = String(input || "").trim().replace(",", ".");
  const value = Number(normalized);
  if (!Number.isFinite(value)) return 0;
  return value;
}

function safeReturnUrl(input: string) {
  if (!input) return "";
  if (!input.startsWith("/budgets")) return "";
  return input;
}

function buildMonthsToSync(selectedMonthRef: string, currentRef: string) {
  const targets = [selectedMonthRef];
  if (selectedMonthRef !== currentRef) return targets;

  const [yearRaw, monthRaw] = selectedMonthRef.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return targets;

  for (let m = month + 1; m <= 12; m++) {
    targets.push(`${year}-${String(m).padStart(2, "0")}`);
  }

  return targets;
}

function withStatus(url: string, key: "ok" | "error", value: string) {
  const params = new URLSearchParams();
  const [basePath, queryRaw] = String(url || "/budgets").split("?");

  if (queryRaw) {
    const existing = new URLSearchParams(queryRaw);
    existing.forEach((itemValue, itemKey) => params.set(itemKey, itemValue));
  }

  params.set(key, value);
  return `${basePath}?${params.toString()}`;
}
