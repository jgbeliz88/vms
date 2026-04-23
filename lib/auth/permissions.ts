import type { EntraSession } from "@/lib/session/types";

export const ROLES = {
  ADMIN: "admin",
  OPERATOR: "operator",
  VIEWER: "viewer",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export function hasRole(user: EntraSession["user"] | null, allowed: Role[]): boolean {
  if (!user) return false;
  return allowed.some((r) => user.roles.includes(r));
}
