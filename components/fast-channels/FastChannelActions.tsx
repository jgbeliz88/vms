"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils/cn";
import { useToast } from "@/components/ui/Toast";
import { useScheduleFastChannelTransition, useCreateXmlTransition } from "@/features/fast-channels/hooks";
import { queryKeys } from "@/lib/query-keys";
import { CreateTransitionForm, type TransitionPayload } from "./CreateTransitionPanel";
import { RecreateChannelPanel } from "./RecreateChannelPanel";

type ActionId = "create-transition" | "recreate-channel";

const ACTIONS: {
  id: ActionId;
  label: string;
  description: string;
  group: string;
  tone: "brand" | "danger";
  destructive?: boolean;
  icon: React.ReactNode;
}[] = [
  {
    id: "create-transition",
    label: "Create Transition",
    description: "Schedule the next program swap from an EPG JSON payload or a SMIL document.",
    group: "Programming",
    tone: "brand",
    icon: (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 8h12M12 4l4 4-4 4" />
        <path d="M20 16H8M12 20l-4-4 4-4" />
      </svg>
    ),
  },
  {
    id: "recreate-channel",
    label: "Recreate Channel",
    description: "Delete and rebuild the channel from its current SMIL, re-queuing its transitions.",
    group: "Maintenance",
    tone: "danger",
    destructive: true,
    icon: (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 12a9 9 0 0 1 15.3-6.4L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-15.3 6.4L3 16" />
        <path d="M3 21v-5h5" />
      </svg>
    ),
  },
];

export function FastChannelActions({ channelName }: { channelName: string }) {
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const scheduleJson = useScheduleFastChannelTransition();
  const createXml = useCreateXmlTransition();

  const [selectedAction, setSelectedAction] = useState<ActionId | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [formMode, setFormMode] = useState<"json" | "xml">("json");

  const isSubmitting = scheduleJson.isPending || createXml.isPending;
  const activeAction = ACTIONS.find((a) => a.id === selectedAction) ?? null;

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
    <div>
      <div className="flex items-center justify-between border-b border-border-base px-5 py-3.5 dark:border-slate-800">
        <div className="flex items-center gap-2">
          {activeAction === null ? (
            <>
              <span className="text-sm font-semibold text-text-primary dark:text-slate-100">Actions</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-text-secondary dark:bg-slate-800 dark:text-slate-400">
                {ACTIONS.length}
              </span>
            </>
          ) : (
            <>
              <button
                onClick={() => setSelectedAction(null)}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-text-secondary transition hover:text-text-primary dark:hover:text-slate-100"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m15 18-6-6 6-6" />
                </svg>
                Actions
              </button>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="text-sm font-semibold text-text-primary dark:text-slate-100">
                {activeAction.label}
              </span>
            </>
          )}
        </div>
        <span className="text-[11px] text-text-muted">
          Channel: <span className="font-mono text-text-primary dark:text-slate-200">{channelName}</span>
        </span>
      </div>

      <section className="min-h-[400px] p-6">
        {activeAction === null && (
          <div className="grid gap-4 sm:grid-cols-2">
            {ACTIONS.map((action) => (
              <button
                key={action.id}
                onClick={() => setSelectedAction(action.id)}
                className={cn(
                  "flex flex-col items-start gap-2.5 rounded-2xl border border-border-base bg-white p-5 text-left transition dark:border-slate-800 dark:bg-slate-900",
                  action.tone === "danger"
                    ? "hover:border-danger hover:bg-rose-50/50 dark:hover:bg-rose-500/5"
                    : "hover:border-brand-500 hover:bg-brand-50/40 dark:hover:bg-brand-900/10"
                )}
              >
                <span
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-lg",
                    action.tone === "danger"
                      ? "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200"
                      : "bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300"
                  )}
                >
                  {action.icon}
                </span>
                <span className="flex items-center gap-2 text-sm font-semibold text-text-primary dark:text-slate-100">
                  {action.label}
                  {action.destructive && (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-rose-800 dark:bg-rose-500/20 dark:text-rose-200">
                      Destructive
                    </span>
                  )}
                </span>
                <span className="text-xs leading-relaxed text-text-secondary">{action.description}</span>
                <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                  {action.group}
                </span>
              </button>
            ))}
          </div>
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

        {selectedAction === "recreate-channel" && <RecreateChannelPanel channelName={channelName} />}
      </section>
    </div>
  );
}
