import { z } from "zod";
import { actionRunResponseSchema, healthResponseSchema, historyResponseSchema } from "@/lib/api/schemas";
import { ActionConfig } from "./types";

type AnyActionConfig = ActionConfig<z.ZodTypeAny, z.ZodTypeAny>;

const actionRunInputSchema = z.object({
  actionType: z.string().min(1, "Action type is required"),
  payload: z.unknown().optional()
});

const healthInputSchema = z.object({});

const historyInputSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional()
});

export const actionsConfig: Array<AnyActionConfig> = [
  {
    id: "run-action",
    title: "Run Action",
    description: "Trigger an action run with a payload.",
    endpoint: "/api/actions/run",
    method: "POST",
    inputSchema: actionRunInputSchema,
    outputSchema: actionRunResponseSchema,
    fields: [
      {
        name: "actionType",
        label: "Action Type",
        type: "text",
        placeholder: "e.g. rebuild-index",
        required: true
      },
      {
        name: "payload",
        label: "Payload (JSON)",
        type: "json",
        placeholder: "{\n  \"key\": \"value\"\n}",
        helperText: "Optional JSON payload sent to the backend."
      }
    ]
  },
  {
    id: "health",
    title: "Health Check",
    description: "Check API health status.",
    endpoint: "/api/actions/health",
    method: "GET",
    inputSchema: healthInputSchema,
    outputSchema: healthResponseSchema,
    fields: []
  },
  {
    id: "history",
    title: "Fetch History",
    description: "Retrieve action history from the backend.",
    endpoint: "/api/history",
    method: "GET",
    inputSchema: historyInputSchema,
    outputSchema: historyResponseSchema,
    fields: [
      {
        name: "page",
        label: "Page",
        type: "number",
        placeholder: "1",
        defaultValue: 1
      },
      {
        name: "pageSize",
        label: "Page Size",
        type: "number",
        placeholder: "25",
        defaultValue: 25
      }
    ]
  }
];
