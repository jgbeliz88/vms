"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { hasPermission, PERMISSIONS, type Permission } from "@/lib/auth/permissions";
import { NoPermission } from "@/components/NoPermission";
import type { EntraSession } from "@/lib/session/types";

export function AuthGuard({
  children,
  allowedPermissions = [PERMISSIONS.ACCESS_APP],
}: {
  children: React.ReactNode;
  allowedPermissions?: Permission[];
}) {
  const router = useRouter();
  const { data, status } = useSession();
  const session = data as EntraSession | null;

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status === "loading" || status === "unauthenticated") return null;

  if (allowedPermissions && session && !hasPermission(
    { oid: session.user.oid, name: session.user.name, email: session.user.email, roles: session.user.roles },
    allowedPermissions
  )) {
    return <NoPermission />;
  }

  return <>{children}</>;
}
