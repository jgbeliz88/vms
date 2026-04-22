"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { ActionConfig } from "./types";
import { buildInitialValues } from "./utils";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

export type ActionFormProps = {
  config: ActionConfig<z.ZodTypeAny, z.ZodTypeAny>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSubmit: (values: Record<string, any>) => void;
  loading?: boolean;
  errors?: Record<string, string>;
};

export function ActionForm({ config, onSubmit, loading, errors = {} }: ActionFormProps) {
  const initialValues = useMemo(() => buildInitialValues(config.fields), [config.fields]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [values, setValues] = useState<Record<string, any>>(initialValues);

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues, config.id]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChange = (name: string, value: any) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit(values);
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      {config.fields.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900">
          This action does not require inputs.
        </div>
      ) : null}
      {config.fields.map((field) => {
        if (field.type === "textarea") {
          return (
            <Textarea
              key={field.name}
              label={field.label}
              helperText={field.helperText}
              placeholder={field.placeholder}
              value={values[field.name] ?? ""}
              onChange={(event) => handleChange(field.name, event.target.value)}
              error={errors[field.name]}
            />
          );
        }
        if (field.type === "select" && field.options) {
          return (
            <Select
              key={field.name}
              label={field.label}
              helperText={field.helperText}
              options={field.options}
              value={values[field.name] ?? field.options[0]?.value}
              onChange={(event) => handleChange(field.name, event.target.value)}
              error={errors[field.name]}
            />
          );
        }
        if (field.type === "checkbox") {
          return (
            <label
              key={field.name}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <input
                type="checkbox"
                checked={Boolean(values[field.name])}
                onChange={(event) => handleChange(field.name, event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              {field.label}
            </label>
          );
        }
        if (field.type === "json") {
          return (
            <Textarea
              key={field.name}
              label={field.label}
              helperText={field.helperText}
              placeholder={field.placeholder}
              value={values[field.name] ?? ""}
              onChange={(event) => handleChange(field.name, event.target.value)}
              error={errors[field.name]}
            />
          );
        }

        return (
          <Input
            key={field.name}
            label={field.label}
            helperText={field.helperText}
            type={field.type === "number" ? "number" : "text"}
            placeholder={field.placeholder}
            value={values[field.name] ?? ""}
            onChange={(event) => handleChange(field.name, event.target.value)}
            error={errors[field.name]}
          />
        );
      })}
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Running..." : "Run Action"}
        </Button>
      </div>
    </form>
  );
}
