"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { CdnConfigEntry, CdnExceptionEntry, CdnRouting } from "./types";

async function readError(response: Response, fallback: string): Promise<string> {
  const data = await response.json().catch(() => null);
  const message = data && typeof data === "object" ? (data as Record<string, unknown>).message : null;
  return typeof message === "string" && message ? message : fallback;
}

export function useCdnRoutingQuery() {
  return useQuery({
    queryKey: queryKeys.cdnRouting(),
    queryFn: async () => {
      const response = await fetch("/api/cdn/routing", { cache: "no-store" });
      if (!response.ok) throw new Error(await readError(response, "Failed to load CDN routing"));
      return (await response.json()) as CdnRouting;
    },
  });
}

export function useUpdateCdnProviders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (configurations: CdnConfigEntry[]) => {
      const response = await fetch("/api/cdn/routing/providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configurations }),
      });
      if (!response.ok) throw new Error(await readError(response, "Failed to update CDN providers"));
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cdnRouting() });
    },
  });
}

export function useUpdateCdnExceptions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      documentId,
      features,
    }: {
      documentId: string;
      features: CdnExceptionEntry[];
    }) => {
      const response = await fetch("/api/cdn/routing/exceptions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, features }),
      });
      if (!response.ok) throw new Error(await readError(response, "Failed to update channel exceptions"));
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cdnRouting() });
    },
  });
}
