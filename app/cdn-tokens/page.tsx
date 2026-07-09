"use client";

import { AppShell } from "@/components/AppShell";
import { CdnTokenGenerator } from "@/components/cdn-tokens/CdnTokenGenerator";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { useRequirePermission } from "@/lib/auth/useRequirePermission";

export default function CdnTokensPage() {
  const allowed = useRequirePermission(PERMISSIONS.CDN_PAGE);
  if (!allowed) return null;

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Token Generation
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-slate-600 dark:text-slate-300">
            Mint a signed CDN access token in a few clicks. Pick a CDN and stream, choose what it
            can reach, set how long it lives.
          </p>
        </div>
        <CdnTokenGenerator />
      </div>
    </AppShell>
  );
}
