import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { EntraSession } from "@/lib/session/types";

export default auth((req) => {
  const session = req.auth as EntraSession | null;
  const isLoggedIn = !!session;
  const hasError = session?.error === "RefreshAccessTokenError";
  const { pathname } = req.nextUrl;
  const isLoginPage = pathname === "/login";
  const isNoAccessPage = pathname === "/no-access";

  if (!isLoggedIn || hasError) {
    if (isLoginPage) return NextResponse.next();
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (pathname === "/actions") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (!isNoAccessPage && !session.user.roles.includes("vms_access_app")) {
    return NextResponse.redirect(new URL("/no-access", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|api/status-simple|api/status-complete|_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|png|gif|svg|webp|ico)$).*)"],
};
