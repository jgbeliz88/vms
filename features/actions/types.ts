import { z } from "zod";

export type ActionField = {
  name: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "checkbox" | "json";
  placeholder?: string;
  options?: { label: string; value: string }[];
  required?: boolean;
  defaultValue?: string | number | boolean | object | null;
  helperText?: string;
};

export type ActionConfig<TInput extends z.ZodTypeAny, TOutput extends z.ZodTypeAny> = {
  id: string;
  title: string;
  description: string;
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  inputSchema: TInput;
  outputSchema: TOutput;
  fields: ActionField[];
};

export type ActionResult<TOutput extends z.ZodTypeAny> = {
  data: z.infer<TOutput>;
  requestId?: string;
};
