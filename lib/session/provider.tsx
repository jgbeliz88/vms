"use client";

import { createContext, useContext, useMemo } from "react";
import { useSession as useNextAuthSession, signOut } from "next-auth/react";
import type { EntraSession } from "@/lib/session/types";

// Module-level cache — updated each render cycle by the provider below.
// Allows lib/storage/token.ts → getToken() to remain a plain function call
// (no hook required) while always having the current Azure AD access token.
let _cachedToken: string | null = null;
export function getCachedToken(): string | null { return _cachedToken; }

type SessionContextValue = {
  user: EntraSession["user"] | null;
  logout: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { data } = useNextAuthSession();
  const session = data as EntraSession | null;

  _cachedToken = session?.accessToken ?? null;

  const user: EntraSession["user"] | null = session?.user ?? null;

  const logout = () => signOut({ callbackUrl: "/login" });

  const value = useMemo(() => ({ user, logout }), [user]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used within SessionProvider");
  return context;
}
