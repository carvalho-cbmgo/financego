import { NextRequest, NextResponse } from "next/server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase";
import { auditLog } from "@/lib/audit-log";
import { getApiUserFromCookiesOrRequest, unauthorized } from "@/lib/auth-server";
import { BankKey, parseCsvStatement, parseStatementText } from "@/lib/bank-parsers";
import { extractPdfText } from "@/lib/pdf-extractor";
import { assertAllowedFile, MAX_RAW_TEXT_CHARS } from "@/lib/upload-limits";


async function linkRefundsForImport(profileId: string, importId: string) {
  const { data: refunds } = await supabaseAdmin
    .from("transactions")
    .select("id, amount, posted_at, refund_match_key")
    .eq("profile_id", profileId)
    .eq("statement_import_id", importId)
    .eq("is_refund", true);

  for (const refund of (refunds || []) as any[]) {
    if (!refund.refund_match_key) continue;

    const absAmount = Math.abs(Number(refund.amount || 0));
    const { data: candidates } = await supabaseAdmin
      .from("transactions")
      .select("id, amount, posted_at, refund_status")
      .eq("profile_id", profileId)
      .eq("refund_match_key", refund.refund_match_key)
      .eq("is_refund", false)
      .lt("amount", 0)
      .order("posted_at", { ascending: false })
      .limit(10);

    const candidate = (candidates || []).find((c: any) => Math.abs(Math.abs(Number(c.amount || 0)) - absAmount) < 0.01)
      || (candidates || [])[0];

    if (!candidate?.id) continue;

    await supabaseAdmin
      .from("transactions")
      .update({ refund_of_transaction_id: candidate.id })
      .eq("id", refund.id);

    await supabaseAdmin
      .from("transactions")
      .update({ refund_status: Math.abs(Math.abs(Number(candidate.amount || 0)) - absAmount) < 0.01 ? "refunded" : "partial_refund" })
      .eq("id", candidate.id);
  }
}



export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const rl = rateLimit(`${ip}:critical`, 30, 60_000);
    if (!rl.ok) return rateLimitResponse();
  const user = await getApiUserFromCookiesOrRequest(req);
  if (!user) return unauthorized();
  await auditLog({ profileId: user.id, action: "api_call", resource: req.url });
    const form = await req.formData();
    const bankKey = String(form.get("bank_key") || "generic") as BankKey;
    const sourceType = String(form.get("source_type") || "manual_text");
    const profileId = user.id;
    const file = form.get("file") as File | null;
    let rawText = String(form.get("raw_text") || "");
    let pdfInfo: any = null;

    let fileName: string | null = null;
    if (file && file.size > 0) {
      fileName = file.name;
      const lowerName = file.name.toLowerCase();
      const mime = file.type || "";

      if (lowerName.endsWith(".pdf") || mime.includes("pdf") || sourceType === "pdf") {
        assertAllowedFile(file);
        const arrayBuffer = await file.arrayBuffer();
        const extracted = await extractPdfText(Buffer.from(arrayBuffer));
        rawText = extracted.text;
        pdfInfo = {
          pages: extracted.pages,
          warnings: extracted.warnings,
          info: extracted.info || null,
        };
      } else {
        assertAllowedFile(file);
        rawText = await file.text();
      }
    }

    const { data: importRun, error: importError } = await supabaseAdmin
      .from("statement_imports")
      .insert({
        profile_id: profileId,
        bank_key: bankKey,
        source_type: sourceType === "pdf" ? "pdf_text" : sourceType,
        file_name: fileName,
        raw_text: rawText.slice(0, MAX_RAW_TEXT_CHARS),
        raw_json: pdfInfo,
        status: "processing",
      })
      .select("id")
      .single();

    if (importError) throw importError;

    const effectiveSourceType = sourceType === "pdf" ? "pdf_text" : sourceType;

    const parsed = effectiveSourceType === "csv"
      ? parseCsvStatement(bankKey, rawText, profileId)
      : parseStatementText(bankKey, rawText, profileId);

    let imported = 0;
    let duplicates = 0;

    for (const tx of parsed) {
      const { error } = await supabaseAdmin
        .from("transactions")
        .upsert({
          profile_id: profileId,
          statement_import_id: importRun?.id,
          bank_key: tx.bankKey,
          dedupe_hash: tx.dedupeHash,
          description: tx.description,
          merchant: tx.merchant || null,
          amount: tx.amount,
          currency_code: "BRL",
          posted_at: tx.postedAt,
          status: "posted",
          type: tx.type,
          source_category: "statement",
          app_category: tx.category,
          app_subcategory: tx.subcategory,
          confidence_score: tx.confidence,
          installment_current: tx.installmentCurrent || null,
          installment_total: tx.installmentTotal || null,
          installment_group_key: tx.installmentGroupKey || null,
          is_transfer: tx.type === "transfer",
          is_refund: !!tx.isRefund,
          refund_status: tx.isRefund ? "refund" : "none",
          refund_match_key: tx.refundMatchKey || null,
          refund_detected_at: tx.isRefund ? new Date().toISOString() : null,
          raw: { source: "statement_import", import_id: importRun?.id, bank_key: tx.bankKey },
        }, { onConflict: "profile_id,dedupe_hash" });

      if (error) {
        if (error.code === "23505") {
          duplicates++;
          continue;
        }

        throw new Error(`Falha ao salvar transaÃ§Ã£o importada (${error.code || "sem-codigo"}): ${error.message}`);
      }

      imported++;
    }

    await linkRefundsForImport(profileId, importRun?.id);

    await supabaseAdmin
      .from("statement_imports")
      .update({
        status: "success",
        total_detected: parsed.length,
        total_imported: imported,
        total_duplicates: duplicates,
        finished_at: new Date().toISOString(),
      })
      .eq("id", importRun?.id);

    return NextResponse.json({
      ok: true,
      import_id: importRun?.id,
      bank_key: bankKey,
      source_type: sourceType,
      pdf: pdfInfo,
      detected: parsed.length,
      imported,
      duplicates,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
