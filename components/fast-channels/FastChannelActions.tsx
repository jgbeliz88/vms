"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { useToast } from "@/components/ui/Toast";
import { useScheduleFastChannelTransition, useCreateXmlTransition } from "@/features/fast-channels/hooks";
import { CreateTransitionForm, type TransitionPayload } from "./CreateTransitionPanel";

type ActionId = "create-transition";

const ACTIONS: { id: ActionId; label: string }[] = [
  { id: "create-transition", label: "Create Transition" },
];

export function FastChannelActions({ channelName }: { channelName: string }) {
  const { notify } = useToast();
  const scheduleJson = useScheduleFastChannelTransition();
  const createXml = useCreateXmlTransition();

  const [selectedAction, setSelectedAction] = useState<ActionId | null>("create-transition");

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
      notify({ title: "Transition created" });
    } catch (error) {
      notify({
        title: "Transition failed",
        description: error instanceof Error ? error.message : "Unable to create transition",
        variant: "error",
      });
    }
  };

  return (
    <div className="flex gap-0">
      <div className="w-44 shrink-0 space-y-0.5 border-r border-slate-100 pr-4 dark:border-slate-800">
        {ACTIONS.map((action) => (
          <button
            key={action.id}
            onClick={() => setSelectedAction(action.id)}
            className={cn(
              "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
              selectedAction === action.id
                ? "bg-brand-50 font-medium text-brand-700 dark:bg-brand-900/20 dark:text-brand-300"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            )}
          >
            {action.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-w-0 pl-6">
        {selectedAction === null && (
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Select an action from the list.
          </p>
        )}
        {selectedAction === "create-transition" && (
          <CreateTransitionForm
            channelName={channelName}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
}
