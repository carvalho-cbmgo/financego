import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getDeviceByToken } from "@/lib/device-auth";


export async function GET(req: NextRequest) {
  try {
    const deviceToken = req.headers.get("x-device-token");
    const device = await getDeviceByToken(deviceToken);
    if (!device) {
      return NextResponse.json({ error: "Dispositivo não autorizado" }, { status: 401 });
    }

    const profileId = device.profile_id;
    const today = new Date().toISOString().slice(0, 10);

    const { data } = await supabaseAdmin
      .from("transactions")
      .select("amount, app_category")
      .eq("profile_id", profileId)
      .gte("posted_at", `${today}T00:00:00.000Z`)
      .lte("posted_at", `${today}T23:59:59.999Z`);

    const spent = (data || [])
      .filter((tx: any) => Number(tx.amount) < 0)
      .reduce((sum: number, tx: any) => sum + Math.abs(Number(tx.amount)), 0);

    const income = (data || [])
      .filter((tx: any) => Number(tx.amount) > 0)
      .reduce((sum: number, tx: any) => sum + Number(tx.amount), 0);

    return NextResponse.json({
      ok: true,
      date: today,
      spent,
      income,
      transactions: data?.length || 0,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
