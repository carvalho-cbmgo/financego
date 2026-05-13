import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const accessToken = body?.access_token;

  if (!accessToken) {
    return NextResponse.json({ error: "Token ausente" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("sb-access-token", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("sb-access-token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
