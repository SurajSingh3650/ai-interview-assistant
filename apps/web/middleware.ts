import { NextRequest, NextResponse } from "next/server";

const protectedPrefixes = [
  "/dashboard",
  "/live-interview",
  "/practice",
  "/analytics",
  "/settings"
];

function isTokenExpired(token: string): boolean {
  try {
    const payloadBase64 = token.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/");
    if (!payloadBase64) return true;
    const padded = payloadBase64.padEnd(payloadBase64.length + ((4 - (payloadBase64.length % 4)) % 4), "=");
    const payload = JSON.parse(atob(padded)) as {
      exp?: number;
    };
    if (!payload.exp) return false;
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const requiresAuth = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (!requiresAuth) return NextResponse.next();

  const token = req.cookies.get("auth_token")?.value;
  if (!token || isTokenExpired(token)) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    const res = NextResponse.redirect(loginUrl);
    res.cookies.delete("auth_token");
    res.cookies.delete("auth_user");
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/live-interview/:path*", "/practice/:path*", "/analytics/:path*", "/settings/:path*"]
};
