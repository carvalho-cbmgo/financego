import { NextRequest, NextResponse } from "next/server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase";
import { auditLog } from "@/lib/audit-log";
import { getDeviceByToken } from "@/lib/device-auth";
import { parseNotificationByBank } from "@/lib/bank-parsers";
import { ensureAccountForBank } from "@/lib/accounts";


export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const rl = rateLimit(`${ip}:critical`, 30, 60_000);
    if (!rl.ok) return rateLimitResponse();
    const deviceToken = req.headers.get("x-device-token");
    const device = await getDeviceByToken(deviceToken);
    if (!device) {
      return NextResponse.json({ error: "Dispositivo não autorizado" }, { status: 401 });
    }
    await auditLog({ profileId: device.profile_id, action: "device_api_call", resource: req.url });

    const body = await req.json();
    const profileId = device.profile_id;

    const parsed = parseNotificationByBank({
      profileId,
      packageName: body.packageName || body.package_name,
      appName: body.appName || body.app_name,
      title: body.title,
      text: body.text,
      bigText: body.bigText || body.big_text,
      postedAt: body.postedAt || body.posted_at,
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

    if (!parsed) {
      return NextResponse.json({ ok: true, parsed: false, event_id: event?.id });
    }
    const accountId = await ensureAccountForBank(profileId, parsed.bankKey);

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
        app_subcategory: parsed.subcategory,
        confidence_score: parsed.confidence,
        installment_current: parsed.installmentCurrent || null,
        installment_total: parsed.installmentTotal || null,
        installment_group_key: parsed.installmentGroupKey || null,
        source_device_id: body.deviceId || body.device_id || null,
        source_notification_id: body.notificationId || body.id || null,
        is_transfer: parsed.type === "transfer",
        is_consolidated: true,
        is_refund: !!parsed.isRefund,
        refund_status: parsed.isRefund ? "refund" : "none",
        refund_match_key: parsed.refundMatchKey || null,
        refund_detected_at: parsed.isRefund ? new Date().toISOString() : null,
        raw: { source: "mobile_notification", event_id: event?.id, original: body },
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
      bank_key: parsed.bankKey,
      transaction_id: tx?.id,
      amount: parsed.amount,
      category: parsed.category,
      subcategory: parsed.subcategory,
      confidence: parsed.confidence,
      installment: {
        current: parsed.installmentCurrent,
        total: parsed.installmentTotal,
      },
      refund: {
        is_refund: !!parsed.isRefund,
        refund_match_key: parsed.refundMatchKey,
        original_merchant: parsed.originalRefundMerchant,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
