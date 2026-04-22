import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { EntraSession } from "@/lib/session/types";

export default auth((req) => {
  const session = req.auth as EntraSession | null;
  const isLoggedIn = !!session;
  const hasError = session?.error === "RefreshAccessTokenError";
  const isLoginPage = req.nextUrl.pathname === "/login";

  if (!isLoggedIn || hasError) {
    if (isLoginPage) return NextResponse.next();
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
