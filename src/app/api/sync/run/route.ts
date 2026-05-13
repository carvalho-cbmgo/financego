import { NextRequest, NextResponse } from "next/server";
import { runScheduledSync } from "../../../../../scripts/sync-core";

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("x-sync-endpoint-secret");
    if (secret !== process.env.SYNC_ENDPOINT_SECRET) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    const result = await runScheduledSync();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
