"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { hasPermission, type Permission } from "@/lib/auth/permissions";
import type { EntraSession } from "@/lib/session/types";

/**
 * Page-level guard: redirects to the dashboard with an error toast when the user
 * lacks `permission`. Returns whether access is allowed so callers can render
 * `null` until the redirect lands, avoiding a flash of protected content.
 */
export function useRequirePermission(permission: Permission): boolean {
  const { notify } = useToast();
  const router = useRouter();
  const { data, status } = useSession();
  const session = data as EntraSession | null;

  const allowed = status !== "loading" && hasPermission(session?.user ?? null, [permission]);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") { router.replace("/login"); return; }
    if (!allowed) {
      notify({ title: "You are not allowed to access this page.", variant: "error" });
      router.replace("/");
    }
  }, [status, allowed, notify, router]);

  return allowed;
}
