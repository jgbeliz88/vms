// Token is now managed by NextAuth via lib/session/provider.tsx.
// Re-export under the existing name so all callers remain untouched.
export { getCachedToken as getToken } from "@/lib/session/provider";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function setToken(_token: string): void {
  // No-op: tokens are managed by NextAuth, not stored manually.
}

export function clearToken(): void {
  // No-op: use signOut() (via useSession().logout) to end the session.
}
