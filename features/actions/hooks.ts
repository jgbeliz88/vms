import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { getToken } from "@/lib/storage/token";
import { historyResponseSchema, healthResponseSchema } from "@/lib/api/schemas";
import { ActionConfig } from "./types";
import { sanitizeValues, validateInput } from "./utils";
import { queryKeys } from "@/lib/query-keys";

function authHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export function useActionMutation(config: ActionConfig<z.ZodTypeAny, z.ZodTypeAny>) {
  return useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: async (rawValues: Record<string, any>) => {
      const payload = sanitizeValues(config.fields, rawValues);
      const parsed = validateInput(config.inputSchema, payload);
      if (!parsed.success) {
        const issues = parsed.error.issues.map((issue) => issue.message).join(" | ");
        throw new Error(issues || "Validation error");
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = parsed.data as Record<string, any>;

      let url: string;
      let body: string | undefined;

      if (config.method === "GET") {
        const params = new URLSearchParams();
        for (const [k, v] of Object.entries(data)) {
          if (v !== undefined && v !== null) params.set(k, String(v));
        }
        url = `${config.endpoint}?${params.toString()}`;
      } else {
        url = config.endpoint;
        body = JSON.stringify(data);
      }

      const response = await fetch(url, {
        method: config.method,
        headers: authHeaders(),
        body,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Request failed with status ${response.status}`);
      }

      const json = await response.json();
      const validated = config.outputSchema.safeParse(json);
      if (!validated.success) throw new Error("Response validation failed");

      return { data: validated.data };
    },
  });
}

export function useHealthQuery(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.health(),
    queryFn: async () => {
      const response = await fetch("/api/actions/health", {
        headers: authHeaders(),
      });
      if (!response.ok) throw new Error("Health check failed");
      const json = await response.json();
      const parsed = healthResponseSchema.safeParse(json);
      if (!parsed.success) throw new Error("Response validation failed");
      return { data: parsed.data };
    },
    enabled,
  });
}

export function useHistoryQuery(enabled: boolean, page = 1, pageSize = 25) {
  return useQuery({
    queryKey: queryKeys.history(page, pageSize),
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      const response = await fetch(`/api/history?${params.toString()}`, {
        headers: authHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch history");
      const json = await response.json();
      const parsed = historyResponseSchema.safeParse(json);
      if (!parsed.success) throw new Error("Response validation failed");
      return { data: parsed.data };
    },
    enabled,
  });
}
