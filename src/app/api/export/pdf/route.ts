import { NextRequest, NextResponse } from "next/server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase";
import { auditLog } from "@/lib/audit-log";
import { getApiUserFromCookiesOrRequest, unauthorized } from "@/lib/auth-server";

function brl(value: any) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function d(value: any) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const rl = rateLimit(`${ip}:critical`, 30, 60_000);
    if (!rl.ok) return rateLimitResponse();

    const user = await getApiUserFromCookiesOrRequest(req);
    if (!user) return unauthorized();

    await auditLog({ profileId: user.id, action: "api_call", resource: req.url });

    const { data: txs } = await supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("profile_id", user.id)
      .order("posted_at", { ascending: false })
      .limit(500);

    const income = (txs || []).filter((t: any) => Number(t.amount) > 0).reduce((s: number, t: any) => s + Number(t.amount), 0);
    const expense = (txs || []).filter((t: any) => Number(t.amount) < 0).reduce((s: number, t: any) => s + Math.abs(Number(t.amount)), 0);

    const rows = (txs || [])
      .map(
        (tx: any) => `
      <tr>
        <td>${d(tx.posted_at)}</td>
        <td>${tx.bank_key || "-"}</td>
        <td>${tx.description || "-"}</td>
        <td>${tx.app_category || "-"}</td>
        <td class="money">${brl(tx.amount)}</td>
      </tr>
    `
      )
      .join("");

    const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Relatorio Financeiro</title>
<style>
  body { font-family: Arial, sans-serif; padding: 32px; color: #111827; }
  h1 { margin-bottom: 4px; }
  .muted { color: #6b7280; }
  .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 24px 0; }
  .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; }
  .label { color: #6b7280; font-size: 12px; }
  .value { font-size: 22px; font-weight: bold; margin-top: 6px; }
  table { width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 12px; }
  th, td { border-bottom: 1px solid #e5e7eb; padding: 8px; text-align: left; vertical-align: top; }
  th { background: #f9fafb; }
  .money { text-align: right; white-space: nowrap; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <h1>Relatorio Financeiro</h1>
  <div class="muted">Gerado em ${d(new Date().toISOString())}</div>

  <div class="cards">
    <div class="card"><div class="label">Receitas</div><div class="value">${brl(income)}</div></div>
    <div class="card"><div class="label">Despesas</div><div class="value">${brl(expense)}</div></div>
    <div class="card"><div class="label">Saldo</div><div class="value">${brl(income - expense)}</div></div>
  </div>

  <h2>Transações</h2>
  <table>
    <thead>
      <tr>
        <th>Data</th>
        <th>Banco</th>
        <th>Descrição</th>
        <th>Categoria</th>
        <th>Valor</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <script>window.print()</script>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
