import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Encoder, EncoderPod, MediaexcelChannel } from "./types";
import { queryKeys } from "@/lib/query-keys";

export function useEncodersQuery() {
  return useQuery({
    queryKey: queryKeys.liveEncoders(),
    queryFn: async () => {
      const response = await fetch("/api/live/encoders", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load encoders");
      return (await response.json()) as Encoder[];
    },
  });
}

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

export function useCreateEncoder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { encoderChannel: string; heroName: string }) => {
      const response = await fetch("/api/live/encoders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(json.message || "Unable to create encoder");
      }
      return (await response.json()) as Encoder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.liveEncoders() });
    },
  });
}

export function useDeleteEncoder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { id: number }) => {
      const response = await fetch(`/api/live/encoders?encoderId=${payload.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(json.message || "Unable to delete encoder");
      }
      return (await response.json()) as { ok: boolean };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.liveEncoders() });
    },
  });
}

export function useCreatePod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { encoderId: number; name: string }) => {
      const response = await fetch("/api/live/pods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(json.message || "Unable to create pod");
      }
      return (await response.json()) as EncoderPod;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.liveEncoders() });
    },
  });
}

export function useDeleteEncoderPod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (podId: number) => {
      const response = await fetch(`/api/live/pods?podId=${podId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(json.message || "Unable to delete pod");
      }
      return (await response.json()) as { ok: boolean };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.liveEncoders() });
    },
  });
}
