import { NextResponse } from "next/server";
import { getApiUserFromRequest, unauthorized } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase";
import { inferPreferredAccountTypeFromNotification, parseNotificationByBank } from "@/lib/bank-parsers";
import { ensureAccountForBank } from "@/lib/accounts";

export async function POST(req: Request) {
  const user = await getApiUserFromRequest(req);
  if (!user) return unauthorized();

  const body = await req.json();
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const parsed = parseNotificationByBank({
    profileId: user.id,
    packageName: body.packageName || body.package_name,
    appName: body.appName || body.app_name,
    title: body.title,
    text: body.text,
    bigText: body.bigText || body.big_text,
    subText: body.subText || body.sub_text,
    summaryText: body.summaryText || body.summary_text,
    infoText: body.infoText || body.info_text,
    textLines: body.textLines || body.text_lines,
    extraText: body.extraText || body.extra_text,
    postedAt: body.postedAt || body.posted_at,
    profileFullName: profile?.full_name || null,
  });

  const { data: event, error: eventError } = await supabaseAdmin
    .from("notification_events")
    .insert({
      profile_id: user.id,
      package_name: body.packageName || body.package_name || null,
      app_name: body.appName || body.app_name || null,
      title: body.title || null,
      text: body.text || null,
      big_text: body.bigText || body.big_text || null,
      raw: body,
      parsed: !!parsed,
      ignored_reason: parsed ? null : "sem_valor_ou_parser_incompativel",
    })
    .select("id")
    .single();

  if (eventError) throw eventError;
  if (!parsed) return NextResponse.json({ ok: true, parsed: false, event_id: event?.id });

  const preferredAccountType = inferPreferredAccountTypeFromNotification({
    packageName: body.packageName || body.package_name,
    appName: body.appName || body.app_name,
    title: body.title,
    text: body.text,
    bigText: body.bigText || body.big_text,
    subText: body.subText || body.sub_text,
    summaryText: body.summaryText || body.summary_text,
    infoText: body.infoText || body.info_text,
    textLines: body.textLines || body.text_lines,
    extraText: body.extraText || body.extra_text,
  });
  const accountId = await ensureAccountForBank(user.id, parsed.bankKey, preferredAccountType);
  const { data: tx, error: txError } = await supabaseAdmin
    .from("transactions")
    .upsert({
      profile_id: user.id,
      account_id: accountId,
      bank_key: parsed.bankKey,
      dedupe_hash: parsed.dedupeHash,
      description: parsed.description,
      merchant: parsed.merchant || null,
      amount: parsed.amount,
      currency_code: "BRL",
      posted_at: parsed.postedAt,
      status: "posted",
      type: parsed.type,
      source_category: "notification",
      app_category: parsed.category,
      app_subcategory: null,
      confidence_score: parsed.confidence,
      source_device_id: body.deviceId || body.device_id || "android-native",
      source_notification_id: body.notificationId || body.id || null,
      is_transfer: parsed.type === "transfer",
      is_consolidated: true,
      raw: { source: "android_notification_listener", event_id: event?.id, original: body },
    }, { onConflict: "profile_id,dedupe_hash" })
    .select("id")
    .single();

  if (txError) throw txError;

  await supabaseAdmin
    .from("notification_events")
    .update({ parsed_transaction_id: tx?.id })
    .eq("id", event?.id);

  return NextResponse.json({
    ok: true,
    parsed: true,
    transaction_id: tx?.id,
    type: parsed.type,
    description: parsed.description,
    amount: parsed.amount,
  });
}
