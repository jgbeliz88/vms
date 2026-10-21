import { useQuery } from "@tanstack/react-query";
import type { MediaexcelChannel } from "./types";
import { queryKeys } from "@/lib/query-keys";

export function useMediaexcelChannelsQuery() {
  return useQuery({
    queryKey: queryKeys.liveMediaexcelChannels(),
    queryFn: async () => {
      const res = await fetch("/api/live/mediaexcel-channels", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load mediaexcel channels");
      return (await res.json()) as MediaexcelChannel[];
    },
  });
}
