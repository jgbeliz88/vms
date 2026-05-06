import { useMutation, useQuery } from "@tanstack/react-query";
import type { LightflowVodContent } from "./lightflow-types";
import { queryKeys } from "@/lib/query-keys";
import { getToken } from "@/lib/storage/token";

export function useBitmovinVodQuery() {
  return useQuery({
    queryKey: queryKeys.bitmovinVod(),
    queryFn: async () => {
      const response = await fetch("/api/vod/bitmovin", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load Bitmovin VOD");
      return await response.json();
    },
  });
}

export function useLightflowVodQuery() {
  return useQuery({
    queryKey: queryKeys.lightflowVod(),
    queryFn: async () => {
      const response = await fetch("/api/vod/lightflow", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load Lightflow VOD");
      return (await response.json()) as LightflowVodContent[];
    }
  });
}

export function useCreateServerManifest() {
  return useMutation({
    mutationFn: async (params: {
      mam: string;
      uuid: string;
      trackLanguage: string;
      isKms: boolean;
      copyInputs: boolean;
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
