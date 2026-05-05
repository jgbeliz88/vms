import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FastChannel, FastChannelTransitions } from "./types";
import { queryKeys } from "@/lib/query-keys";

export function useFastChannelsQuery() {
  return useQuery({
    queryKey: queryKeys.fastChannels(),
    queryFn: async () => {
      const response = await fetch("/api/fast-channels", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load fast channels");
      return (await response.json()) as FastChannel[];
    }
  });
}

export function useCreateFastChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: { name: string; smil: string }) => {
      const response = await fetch(`/api/fast-channels/${encodeURIComponent(values.name)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/xml" },
        body: values.smil,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to create fast channel");
      }
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.fastChannels() })
  });
}

export function useDeleteFastChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch(`/api/fast-channels/${encodeURIComponent(name)}`, {
        method: "DELETE"
      });
      if (!response.ok) throw new Error("Failed to delete fast channel");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.fastChannels() })
  });
}

export function useCreateFastChannelTransition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: { channel: string; type: string; duration: number; description: string }) => {
      const response = await fetch("/api/fast-channels/transitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });
      if (!response.ok) throw new Error("Failed to create transition");
      return response.json();
    },
    // NOTE: broad invalidation — intentionally clears all transition caches on create.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fast-channel-transitions"] })
  });
}

export function useFastChannelStreamStatusQuery(uri: string) {
  return useQuery({
    queryKey: queryKeys.fastChannelStreamStatus(uri),
    queryFn: async () => {
      const response = await fetch("/api/fast-channels/stream-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uri })
      });
      if (!response.ok) throw new Error("Failed to check stream status");
      return response.json() as Promise<{ ok: boolean; urls: { url: string; ok: boolean; httpStatus: number }[] }>;
    },
    refetchInterval: 30000,
    enabled: !!uri
  });
}

export function useFastChannelTransitionsQuery(channelName: string) {
  return useQuery({
    queryKey: queryKeys.fastChannelTransitions(channelName),
    queryFn: async () => {
      const response = await fetch(
        `/api/fast-channels/${encodeURIComponent(channelName)}/transitions`,
        { cache: "no-store" }
      );
      if (!response.ok) throw new Error("Failed to load transitions");
      return (await response.json()) as FastChannelTransitions;
    },
    refetchInterval: 15000
  });
}
