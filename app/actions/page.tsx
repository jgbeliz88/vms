"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthGuard } from "@/components/AuthGuard";
import { ROLES } from "@/lib/auth/permissions";
import { actionsConfig } from "@/features/actions/config";
import { ActionModal } from "@/features/actions/ActionModal";
import { Button } from "@/components/ui/Button";

export default function ActionsPage() {
  const [activeAction, setActiveAction] = useState<(typeof actionsConfig)[number] | null>(null);

  return (
    <AuthGuard allowedRoles={[ROLES.OPERATOR]}>
      <AppShell>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                Actions
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Trigger backend workflows and inspect responses.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {actionsConfig.map((action) => (
              <div
                key={action.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-soft dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {action.title}
                  </div>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {action.description}
                  </p>
                  <div className="mt-4 text-xs text-slate-500">
                    {action.method} {action.endpoint}
                  </div>
                </div>
                <div className="mt-4">
                  <Button onClick={() => setActiveAction(action)}>Open</Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {activeAction ? (
          <ActionModal
            open={Boolean(activeAction)}
            onClose={() => setActiveAction(null)}
            config={activeAction}
          />
        ) : null}
      </AppShell>
    </AuthGuard>
  );
}
