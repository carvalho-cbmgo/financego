import { NextRequest, NextResponse } from "next/server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import ExcelJS from "exceljs";
import { supabaseAdmin } from "@/lib/supabase";
import { auditLog } from "@/lib/audit-log";
import { getApiUserFromCookiesOrRequest, unauthorized } from "@/lib/auth-server";


export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const rl = rateLimit(`${ip}:critical`, 30, 60_000);
    if (!rl.ok) return rateLimitResponse();
  const user = await getApiUserFromCookiesOrRequest(req);
  if (!user) return unauthorized();
  await auditLog({ profileId: user.id, action: "api_call", resource: req.url });
    const profileId = user.id;

    const { data: transactions } = await supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("profile_id", profileId)
      .order("posted_at", { ascending: false });

    const { data: budgets } = await supabaseAdmin
      .from("budgets")
      .select("*")
      .eq("profile_id", profileId);

    const { data: goals } = await supabaseAdmin
      .from("financial_goals")
      .select("*")
      .eq("profile_id", profileId);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Finance MVP";
    workbook.created = new Date();

    const txSheet = workbook.addWorksheet("Transações");
    txSheet.columns = [
      { header: "Data", key: "posted_at", width: 16 },
      { header: "Banco", key: "bank_key", width: 18 },
      { header: "Descrição", key: "description", width: 48 },
      { header: "Estabelecimento", key: "merchant", width: 28 },
      { header: "Categoria", key: "app_category", width: 20 },
      { header: "Subcategoria", key: "app_subcategory", width: 22 },
      { header: "Valor", key: "amount", width: 14 },
      { header: "Parcela Atual", key: "installment_current", width: 14 },
      { header: "Total Parcelas", key: "installment_total", width: 14 },
      { header: "Confiança", key: "confidence_score", width: 12 },
      { header: "Fonte", key: "source_category", width: 16 },
      { header: "É Estorno?", key: "is_refund", width: 12 },
      { header: "Status Estorno", key: "refund_status", width: 16 },
      { header: "Chave Estorno", key: "refund_match_key", width: 18 },
    ];
    txSheet.addRows(transactions || []);
    txSheet.getRow(1).font = { bold: true };
    txSheet.getColumn("amount").numFmt = '"R$"#,##0.00;[Red]-"R$"#,##0.00';

    const budgetSheet = workbook.addWorksheet("Orçamento");
    budgetSheet.columns = [
      { header: "Mês", key: "month_ref", width: 12 },
      { header: "Categoria", key: "category", width: 24 },
      { header: "Planejado", key: "planned_amount", width: 16 },
    ];
    budgetSheet.addRows(budgets || []);
    budgetSheet.getRow(1).font = { bold: true };
    budgetSheet.getColumn("planned_amount").numFmt = '"R$"#,##0.00';

    const goalsSheet = workbook.addWorksheet("Metas");
    goalsSheet.columns = [
      { header: "Meta", key: "name", width: 32 },
      { header: "Valor-alvo", key: "target_amount", width: 16 },
      { header: "Valor atual", key: "current_amount", width: 16 },
      { header: "Prazo", key: "target_date", width: 16 },
      { header: "Observações", key: "notes", width: 48 },
    ];
    goalsSheet.addRows(goals || []);
    goalsSheet.getRow(1).font = { bold: true };
    goalsSheet.getColumn("target_amount").numFmt = '"R$"#,##0.00';
    goalsSheet.getColumn("current_amount").numFmt = '"R$"#,##0.00';

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="finance-export-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
