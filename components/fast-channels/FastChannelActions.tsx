"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils/cn";
import { usePermission } from "@/lib/auth/usePermission";
import { ROLES } from "@/lib/auth/permissions";
import { useToast } from "@/components/ui/Toast";
import { useScheduleFastChannelTransition, useCreateXmlTransition } from "@/features/fast-channels/hooks";
import { queryKeys } from "@/lib/query-keys";
import { CreateTransitionForm, type TransitionPayload } from "./CreateTransitionPanel";

type ActionId = "create-transition";

const ACTIONS: { id: ActionId; label: string; group: string; icon: React.ReactNode }[] = [
  {
    id: "create-transition",
    label: "Create Transition",
    group: "Programming",
    icon: (
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 8h12M12 4l4 4-4 4" />
        <path d="M20 16H8M12 20l-4-4 4-4" />
      </svg>
    ),
  },
];

export function FastChannelActions({ channelName }: { channelName: string }) {
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const scheduleJson = useScheduleFastChannelTransition();
  const createXml = useCreateXmlTransition();

  const [selectedAction, setSelectedAction] = useState<ActionId | null>("create-transition");
  const [formKey, setFormKey] = useState(0);
  const [formMode, setFormMode] = useState<"json" | "xml">("json");

  const isSubmitting = scheduleJson.isPending || createXml.isPending;

  const handleSubmit = async (values: TransitionPayload) => {
    try {
      if (values.mode === "json") {
        await scheduleJson.mutateAsync(values.payload);
      } else {
        await createXml.mutateAsync({
          channelName,
          transitionName: values.transitionName,
          xml: values.xml,
        });
      }
      notify({ title: "Transition created", description: "It may take a few seconds to appear in the list." });
      setFormKey((k) => k + 1);
      queryClient.invalidateQueries({ queryKey: queryKeys.fastChannelTransitions(channelName) });
      // Backend takes about two seconds to reflect the new transition.
      // That's why we are adding a 3s refetch so that it's shown in the transition table after 3s.
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.fastChannelTransitions(channelName) });
      }, 3000);
    } catch (error) {
      notify({
        title: "Transition failed",
        description: error instanceof Error ? error.message : "Unable to create transition",
        variant: "error",
      });
    }
  };

  return (
    <div className="grid grid-cols-[220px_1fr] divide-x divide-border-base dark:divide-slate-800">
      <aside className="space-y-3 p-4">
        {Object.entries(
          ACTIONS.reduce<Record<string, typeof ACTIONS>>((acc, a) => {
            (acc[a.group] ??= []).push(a);
            return acc;
          }, {})
        ).map(([group, items]) => (
          <div key={group}>
            <div className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
              {group}
            </div>
            <div className="space-y-0.5">
              {items.map((action) => {
                const isActive = selectedAction === action.id;
                return (
                  <button
                    key={action.id}
                    onClick={() => setSelectedAction(action.id)}
                    className={cn(
                      "group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition",
                      isActive
                        ? "bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300"
                        : "text-text-primary hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-7 w-7 shrink-0 place-items-center rounded-md transition",
                        isActive
                          ? "bg-white text-brand-700 shadow-soft dark:bg-slate-800 dark:text-brand-300"
                          : "bg-slate-100 text-text-secondary group-hover:bg-white dark:bg-slate-800 dark:text-slate-500 dark:group-hover:bg-slate-700"
                      )}
                    >
                      {action.icon}
                    </span>
                    <span className={cn("flex-1 truncate", isActive ? "font-semibold" : "font-medium")}>
                      {action.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </aside>

      <section className="min-h-[400px] p-6">
        {selectedAction === null && (
          <p className="text-sm text-text-muted">Select an action from the list.</p>
        )}
        {selectedAction === "create-transition" && (
          <CreateTransitionForm
            key={formKey}
            channelName={channelName}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            initialMode={formMode}
            onModeChange={setFormMode}
          />
        )}
      </section>
    </div>
  );
}
