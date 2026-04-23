import { z } from "zod";
import { ActionField } from "./types";

export function buildInitialValues(fields: ActionField[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return fields.reduce<Record<string, any>>((acc, field) => {
    if (field.defaultValue !== undefined) {
      acc[field.name] = field.defaultValue;
      return acc;
    }
    switch (field.type) {
      case "checkbox":
        acc[field.name] = false;
        break;
      case "number":
        acc[field.name] = "";
        break;
      case "json":
        acc[field.name] = "";
        break;
      default:
        acc[field.name] = "";
    }
    return acc;
  }, {});
}

export function parseJsonField(value: string) {
  if (!value) return undefined;
  return JSON.parse(value);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function validateInput(schema: z.ZodTypeAny, values: Record<string, any>) {
  return schema.safeParse(values);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sanitizeValues(fields: ActionField[], values: Record<string, any>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const output: Record<string, any> = {};
  fields.forEach((field) => {
    const value = values[field.name];
    if (field.type === "json") {
      output[field.name] = typeof value === "string" ? parseJsonField(value) : value;
    } else if (field.type === "number") {
      output[field.name] = value === "" ? undefined : Number(value);
    } else {
      output[field.name] = value;
    }
  });
  return output;
}
