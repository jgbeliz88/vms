"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { VmsSettings } from "@/lib/storage/settings";

export function useVmsSettingsQuery() {
  return useQuery({
    queryKey: queryKeys.vmsSettings(),
    queryFn: async () => {
      const res = await fetch("/api/settings", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load settings");
      return (await res.json()) as VmsSettings;
    },
  });
}

export function useUpdateVmsSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: VmsSettings) => {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      return res.json() as Promise<{ msg: string }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vmsSettings() });
    },
  });
}
