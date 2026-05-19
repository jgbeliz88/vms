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

export function useScheduleFastChannelTransition() {
  return useMutation({
    mutationFn: async (payload: object) => {
      const response = await fetch("/api/fast-channels/transitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message ?? "Failed to schedule transition");
      }
      return response.json() as Promise<{ transitionName: string; statusUrl: string; statusCode: number }>;
    }
  });
}

export function useCreateXmlTransition() {
  return useMutation({
    mutationFn: async ({ channelName, transitionName, xml }: {
      channelName: string;
      transitionName: string;
      xml: string;
    }) => {
      const response = await fetch(
        `/api/fast-channels/${encodeURIComponent(channelName)}/transitions/${encodeURIComponent(transitionName)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/xml" },
          body: xml
        }
      );
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message ?? "Failed to create XML transition");
      }
      return response.json() as Promise<{ transitionName: string; statusUrl: string; statusCode: number }>;
    }
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
    enabled: !!uri
  });
}

export function useDeleteFastChannelTransition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ channelName, transitionName }: { channelName: string; transitionName: string }) => {
      const response = await fetch(
        `/api/fast-channels/${encodeURIComponent(channelName)}/transitions/${encodeURIComponent(transitionName)}`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message ?? "Failed to delete transition");
      }
    },
    onSuccess: (_data, { channelName }) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.fastChannelTransitions(channelName) })
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
  });
}
