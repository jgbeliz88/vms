import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ChannelCronJob,
  CronJob,
  FastChannel,
  FastChannelBatch,
  FastChannelConfigRow,
  FastChannelTransitions,
} from "./types";
import { queryKeys } from "@/lib/query-keys";

const TRANSITION_CRON_TYPE = "VC_TRANSITION_PUT";
const SCHEDULE_SMIL_PATH = "/fast-channel/schedule/smil";

/** Enigma names recreate-queued transition cron jobs `recreate-{channelName}-{transitionName}`. */
function cronJobPrefix(channelName: string): string {
  return `recreate-${channelName}-`;
}

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

/**
 * Cron jobs are listed globally, then narrowed to the ones Enigma queued for this channel.
 * Bodies are left out of the list request so unrelated channels' SMIL never reaches the browser.
 */
export function useChannelCronJobsQuery(channelName: string) {
  const select = useCallback(
    (jobs: CronJob[]): ChannelCronJob[] => {
      const prefix = cronJobPrefix(channelName);
      return jobs
        .filter(
          (job) =>
            job.type === TRANSITION_CRON_TYPE &&
            job.path === SCHEDULE_SMIL_PATH &&
            job.id.startsWith(prefix)
        )
        .map((job) => ({ ...job, transitionName: job.id.slice(prefix.length) }))
        .sort((a, b) => a.executionTime.localeCompare(b.executionTime));
    },
    [channelName]
  );

  return useQuery({
    queryKey: queryKeys.cronJobs(),
    queryFn: async () => {
      const response = await fetch("/api/cron-jobs", { cache: "no-store" });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message ?? "Failed to load cron jobs");
      }
      return (await response.json()) as CronJob[];
    },
    enabled: !!channelName,
    select,
  });
}

export function useRunCronJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; channelName: string }) => {
      const response = await fetch(`/api/cron-jobs/${encodeURIComponent(id)}/run`, {
        method: "POST"
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message ?? "Failed to run cron job");
      }
      return response.json();
    },
    // Enigma keeps the cron job after a manual run, so the list is deliberately not
    // invalidated — the row stays put and reports that it already ran.
    onSuccess: (_data, { channelName }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fastChannelTransitions(channelName) });
      // Backend takes about two seconds to reflect the new transition.
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.fastChannelTransitions(channelName) });
      }, 3000);
    }
  });
}

export function useDeleteCronJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/cron-jobs/${encodeURIComponent(id)}`, {
        method: "DELETE"
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message ?? "Failed to delete cron job");
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.cronJobs() })
  });
}

export function useRecreateFastChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (channelName: string) => {
      const response = await fetch(
        `/api/fast-channels/${encodeURIComponent(channelName)}/recreate`,
        { method: "POST" }
      );
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message ?? "Failed to recreate fast channel");
      }
      return response.json();
    },
    onSuccess: (_data, channelName) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cronJobs() });
      queryClient.invalidateQueries({ queryKey: queryKeys.fastChannelTransitions(channelName) });
      queryClient.invalidateQueries({ queryKey: queryKeys.fastChannels() });
    }
  });
}

export function useFastChannelConfigQuery(channelName: string) {
  return useQuery({
    queryKey: queryKeys.fastChannelConfig(channelName),
    queryFn: async () => {
      const response = await fetch(
        `/api/fast-channels/${encodeURIComponent(channelName)}/config`,
        { cache: "no-store" }
      );
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message ?? "Failed to load fast channel config");
      }
      return (await response.json()) as FastChannelConfigRow[];
    },
    enabled: !!channelName,
  });
}

/**
 * The full batch list, used only to resolve the batchId a config save needs — the batch
 * whose name equals the channel name. Fetched only when the user can actually save.
 */
export function useFastChannelBatchesQuery(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.fastChannelBatches(),
    queryFn: async () => {
      const response = await fetch("/api/fast-channels/batches", { cache: "no-store" });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message ?? "Failed to load batches");
      }
      return (await response.json()) as FastChannelBatch[];
    },
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

export function useUpdateFastChannelConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ channelName, batchId, configs }: {
      channelName: string;
      batchId: number;
      configs: FastChannelConfigRow[];
    }) => {
      const response = await fetch(
        `/api/fast-channels/${encodeURIComponent(channelName)}/config`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ batchId, configs }),
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          (data as Record<string, unknown>).message as string ||
          `Request failed with status ${response.status}`
        );
      }
      return data;
    },
    // The PUT echoes back only the rows it wrote, so refetch the full collection.
    onSuccess: (_data, { channelName }) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.fastChannelConfig(channelName) }),
  });
}
