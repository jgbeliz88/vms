"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Modal } from "@/components/ui/Modal";
import { ActionForm } from "./ActionForm";
import { ActionConfig } from "./types";
import { useActionMutation } from "./hooks";
import { JsonViewer } from "@/components/ui/JsonViewer";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { addLocalHistory, maskSensitive } from "@/features/history/storage";

export function ActionModal({
  open,
  onClose,
  config
}: {
  open: boolean;
  onClose: () => void;
  config: ActionConfig<z.ZodTypeAny, z.ZodTypeAny>;
}) {
  const { notify } = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const mutation = useActionMutation(config);

  const result = useMemo(() => mutation.data?.data, [mutation.data]);

  useEffect(() => {
    setErrors({});
  }, [config.id, open]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parseValues = (values: Record<string, any>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed: Record<string, any> = {};
    const nextErrors: Record<string, string> = {};

    config.fields.forEach((field) => {
      const value = values[field.name];
      if (field.type === "json") {
        try {
          parsed[field.name] = value ? JSON.parse(value) : undefined;
        } catch {
          nextErrors[field.name] = "Invalid JSON";
        }
        return;
      }
      if (field.type === "number") {
        parsed[field.name] = value === "" ? undefined : Number(value);
        return;
      }
      parsed[field.name] = value;
    });

    return { parsed, nextErrors };
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSubmit = async (values: Record<string, any>) => {
    setErrors({});
    const { parsed, nextErrors } = parseValues(values);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      notify({
        title: "Fix highlighted fields",
        description: "Some inputs need attention.",
        variant: "error"
      });
      return;
    }

    const validation = config.inputSchema.safeParse(parsed);
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.issues.forEach((issue: { path: (string | number)[]; message: string }) => {
        const key = String(issue.path[0] ?? "form");
        fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      notify({
        title: "Check your inputs",
        description: "Some fields are missing or invalid.",
        variant: "error"
      });
      return;
    }

    try {
      const response = await mutation.mutateAsync(validation.data);
      addLocalHistory({
        id: crypto.randomUUID(),
        actionId: config.id,
        title: config.title,
        status: "success",
        createdAt: new Date().toISOString(),
        request: maskSensitive(validation.data),
        response: maskSensitive(response.data)
      });
      notify({
        title: "Action completed",
        description: "The backend responded successfully.",
        variant: "success"
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Action failed";
      if (message.includes("Response validation failed")) {
        notify({
          title: "Unexpected response",
          description: "Backend response did not match schema.",
          variant: "error"
        });
      } else {
        notify({
          title: "Action failed",
          description: message,
          variant: "error"
        });
      }
      addLocalHistory({
        id: crypto.randomUUID(),
        actionId: config.id,
        title: config.title,
        status: "error",
        createdAt: new Date().toISOString(),
        request: maskSensitive(validation.data),
        error: maskSensitive(error)
      });
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={config.title}>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-sm text-slate-600 dark:text-slate-300">{config.description}</p>
          <div className="mt-4">
            <ActionForm config={config} onSubmit={handleSubmit} loading={mutation.isPending} errors={errors} />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Latest Response
            </div>
            <Badge
              label={
                mutation.isPending
                  ? "Loading"
                  : mutation.isError
                    ? "Error"
                    : mutation.isSuccess
                      ? "Success"
                      : "Idle"
              }
              tone={
                mutation.isError
                  ? "error"
                  : mutation.isSuccess
                    ? "success"
                    : mutation.isPending
                      ? "warning"
                      : "default"
              }
            />
          </div>
          <div className="mt-4 space-y-3 text-xs text-slate-600 dark:text-slate-300">
            {result && typeof result === "object" && (result as Record<string, unknown>).message ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-900 dark:border-emerald-700/40 dark:bg-emerald-500/10 dark:text-emerald-200">
                {String((result as Record<string, unknown>).message)}
              </div>
            ) : null}
            {mutation.error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700 dark:border-rose-700/40 dark:bg-rose-500/10 dark:text-rose-200">
                {mutation.error instanceof Error ? mutation.error.message : "Request failed"}
              </div>
            ) : null}
            {mutation.data ? <JsonViewer data={mutation.data} /> : <div>Run the action to see the response.</div>}
          </div>
        </div>
      </div>
    </Modal>
  );
}
