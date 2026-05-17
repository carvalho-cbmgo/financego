import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPaths = [
  "/dashboard",
  "/mobile",
  "/accounts",
  "/budgets",
  "/goals",
  "/notifications",
  "/charts",
  "/statements",
  "/refunds",
  "/exports",
];

function isMobileRequest(req: NextRequest) {
  const ua = (req.headers.get("user-agent") || "").toLowerCase();
  return /android|iphone|ipad|ipod|mobile|blackberry|iemobile|opera mini/.test(ua);
}

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

  const isMobile = isMobileRequest(req);
  if (pathname.startsWith("/dashboard") && isMobile) {
    const url = req.nextUrl.clone();
    url.pathname = "/mobile";
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith("/mobile") && !isMobile) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/mobile/:path*",
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
