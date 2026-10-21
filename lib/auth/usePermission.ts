import { useSession } from "@/lib/session/provider";
import { hasPermission, type Permission } from "./permissions";

export function usePermission(allowed: Permission[]): boolean {
  const { user } = useSession();
  return hasPermission(user, allowed);
}
