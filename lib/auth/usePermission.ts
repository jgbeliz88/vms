import { useSession } from "@/lib/session/provider";
import { hasRole, type Role } from "./permissions";

export function usePermission(allowed: Role[]): boolean {
  const { user } = useSession();
  return hasRole(user, allowed);
}
