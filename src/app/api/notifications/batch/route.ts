import { NextRequest, NextResponse } from "next/server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { auditLog } from "@/lib/audit-log";
import { getDeviceByToken } from "@/lib/device-auth";
import { inferPreferredAccountTypeFromNotification, parseNotificationByBank } from "@/lib/bank-parsers";
import { supabaseAdmin } from "@/lib/supabase";
import { ensureAccountForBank } from "@/lib/accounts";

async function saveParsedNotification(body: any, profileId: string, profileFullName?: string | null, devicePublicId?: string | null) {
  const parsed = parseNotificationByBank({
    profileId,
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
    profileFullName,
  });

  const { data: event, error: eventError } = await supabaseAdmin
    .from("notification_events")
    .insert({
      profile_id: profileId,
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
  if (!parsed) return { ok: true, parsed: false, event_id: event?.id };
  const preferredAccountType = inferPreferredAccountTypeFromNotification({
    title: body.title,
    text: body.text,
    bigText: body.bigText || body.big_text,
    subText: body.subText || body.sub_text,
    summaryText: body.summaryText || body.summary_text,
    infoText: body.infoText || body.info_text,
    textLines: body.textLines || body.text_lines,
    extraText: body.extraText || body.extra_text,
  });
  const accountId = await ensureAccountForBank(profileId, parsed.bankKey, preferredAccountType);

  const { data: tx, error: txError } = await supabaseAdmin
    .from("transactions")
    .upsert({
      profile_id: profileId,
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
      installment_current: parsed.installmentCurrent || null,
      installment_total: parsed.installmentTotal || null,
      installment_group_key: parsed.installmentGroupKey || null,
      source_device_id: devicePublicId || body.deviceId || body.device_id || null,
      source_notification_id: body.notificationId || body.id || null,
      is_transfer: parsed.type === "transfer",
      is_consolidated: true,
      is_refund: !!parsed.isRefund,
      refund_status: parsed.isRefund ? "refund" : "none",
      refund_match_key: parsed.refundMatchKey || null,
      refund_detected_at: parsed.isRefund ? new Date().toISOString() : null,
      raw: { source: "mobile_notification_batch", event_id: event?.id, original: body },
    }, { onConflict: "profile_id,dedupe_hash" })
    .select("id")
    .single();

  if (txError) throw txError;

  await supabaseAdmin
    .from("notification_events")
    .update({ parsed_transaction_id: tx?.id })
    .eq("id", event?.id);

  return { ok: true, parsed: true, transaction_id: tx?.id };
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const rl = rateLimit(`${ip}:notification_batch`, 30, 60_000);
    if (!rl.ok) return rateLimitResponse();

    const deviceToken = req.headers.get("x-device-token");
    const device = await getDeviceByToken(deviceToken);
    if (!device) {
      return NextResponse.json({ error: "Dispositivo não autorizado" }, { status: 401 });
    }

    await auditLog({ profileId: device.profile_id, action: "notification_batch", resource: req.url });

    const body = await req.json();
    const items = Array.isArray(body.items) ? body.items : [];
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", device.profile_id)
      .maybeSingle();

    let processed = 0;
    let duplicates = 0;
    let failed = 0;
    const results = [];

    for (const item of items) {
      try {
        const result = await saveParsedNotification(item, device.profile_id, profile?.full_name || null, device.device_public_id);
        results.push(result);
        if (result.parsed) processed++;
      } catch (error: any) {
        if (String(error.message || "").toLowerCase().includes("duplicate")) duplicates++;
        else failed++;
        results.push({ ok: false, error: error.message });
      }
    }

    return NextResponse.json({ ok: true, total: items.length, processed, duplicates, failed, results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
