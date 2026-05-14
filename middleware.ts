import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPaths = [
  "/dashboard",
  "/accounts",
  "/budgets",
  "/goals",
  "/notifications",
  "/charts",
  "/statements",
  "/refunds",
  "/exports",
];

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get("sb-access-token")?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/accounts/:path*",
    "/budgets/:path*",
    "/goals/:path*",
    "/notifications/:path*",
    "/charts/:path*",
    "/statements/:path*",
    "/refunds/:path*",
    "/exports/:path*"
  ],
};
