import { useQuery } from "@tanstack/react-query";
import type { LightflowVodContent } from "./lightflow-types";
import { queryKeys } from "@/lib/query-keys";

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
