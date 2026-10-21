import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LightflowVodContent } from "./lightflow-types";
import type { VodFilters, VodContent, PaginatedVodResponse, VodConfigRow } from "./vod-types";
import { queryKeys } from "@/lib/query-keys";
import { getToken } from "@/lib/storage/token";

function buildSearchParams(filters: VodFilters): URLSearchParams {
  const sp = new URLSearchParams();
  sp.set("page", String(filters.page));
  sp.set("limit", String(filters.limit));
  if (filters.sortBy) sp.set("sortBy", filters.sortBy);
  if (filters.order) sp.set("order", filters.order);
  if (filters.id) sp.set("id", filters.id);
  if (filters.status) sp.set("status", filters.status);
  if (filters.createdAtOlderThan) sp.set("createdAtOlderThan", filters.createdAtOlderThan);
  if (filters.createdAtNewerThan) sp.set("createdAtNewerThan", filters.createdAtNewerThan);
  if (filters.name) sp.set("name", filters.name);
  if (filters.labels) filters.labels.forEach((l) => sp.append("labels", l));
  return sp;
}

export function useBitmovinVodQuery(filters: VodFilters) {
  return useQuery({
    queryKey: queryKeys.bitmovinVod(filters),
    queryFn: async () => {
      const sp = buildSearchParams(filters);
      const response = await fetch(`/api/vod/bitmovin?${sp}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load Bitmovin VOD");
      return (await response.json()) as PaginatedVodResponse<VodContent>;
    },
    placeholderData: (prev) => prev,
  });
}

export function useLightflowVodQuery(filters: VodFilters) {
  return useQuery({
    queryKey: queryKeys.lightflowVod(filters),
    queryFn: async () => {
      const sp = buildSearchParams(filters);
      const response = await fetch(`/api/vod/lightflow?${sp}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load Lightflow VOD");
      return (await response.json()) as PaginatedVodResponse<LightflowVodContent>;
    },
    placeholderData: (prev) => prev,
  });
}

export function useCreateServerManifest() {
  return useMutation({
    mutationFn: async (params: {
      mam: string;
      uuid: string;
      trackLanguage: string;
      isKms: boolean;
    }) => {
      const token = getToken();
      const res = await fetch("/api/vod/manifest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          (data as Record<string, unknown>).msg as string ||
          (data as Record<string, unknown>).message as string ||
          `Request failed with status ${res.status}`
        );
      }
      return data;
    },
  });
}

/**
 * The shared VOD configuration. Returns the full collection of UI rows (one per
 * platform/device combo that exists in the backend). This config is global — it is
 * not scoped to a single VOD.
 */
export function useVodConfigQuery() {
  return useQuery({
    queryKey: queryKeys.vodConfig(),
    queryFn: async () => {
      const response = await fetch("/api/vod/config", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load VOD config");
      return (await response.json()) as VodConfigRow[];
    },
  });
}

export function useUpdateVodConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (config: VodConfigRow[]) => {
      const response = await fetch("/api/vod/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          (data as Record<string, unknown>).message as string ||
          `Request failed with status ${response.status}`
        );
      }
      return data;
    },
    // POST returns only the modified rows, so refetch the full collection.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vodConfig() });
    },
  });
}

export function useBlockVod() {
  return useMutation({
    mutationFn: async (params: { mam: string; uuid: string; block: boolean }) => {
      const token = getToken();
      const res = await fetch("/api/vod/block", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          (data as Record<string, unknown>).msg as string ||
          (data as Record<string, unknown>).message as string ||
          `Request failed with status ${res.status}`
        );
      }
      return data;
    },
  });
}
