"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { CdnTokenGenerator } from "@/components/cdn-tokens/CdnTokenGenerator";
import { CdnTrafficRouting } from "@/components/cdn-tokens/CdnTrafficRouting";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { useRequirePermission } from "@/lib/auth/useRequirePermission";
import { cn } from "@/lib/utils/cn";

type CdnTab = "token" | "routing";

const TABS: { key: CdnTab; label: string }[] = [
  { key: "token", label: "Token Generation" },
  { key: "routing", label: "Traffic Routing" },
];

export default function CdnTokensPage() {
  const allowed = useRequirePermission(PERMISSIONS.CDN_PAGE);
  const [tab, setTab] = useState<CdnTab>("token");

  if (!allowed) return null;

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Content Delivery Network
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-slate-600 dark:text-slate-300">
            Mint signed CDN tokens, and steer live &amp; on-demand traffic between providers.
          </p>
        </div>

        <div className="flex border-b border-[#E2E8F0] dark:border-[#2E3A47]">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={cn(
                "relative top-px mr-6 border-b-2 px-1 py-2.5 text-sm font-semibold transition-colors",
                tab === item.key
                  ? "border-brand-500 text-brand-600 dark:text-[#818CF8]"
                  : "border-transparent text-[#64748B] hover:text-[#1C2434] dark:text-[#8899A8] dark:hover:text-[#DEE4EE]"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "token" ? <CdnTokenGenerator /> : <CdnTrafficRouting />}
      </div>
    </AppShell>
  );
}
