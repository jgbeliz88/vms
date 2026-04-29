import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ResolvedChannel, Linear, PlaybackDiagnostics, ChannelConfigRow } from "./types";
import { getToken } from "@/lib/storage/token";
import { queryKeys } from "@/lib/query-keys";

export function useChannelsQuery() {
  return useQuery({
    queryKey: queryKeys.liveChannels(),
    queryFn: async () => {
      const response = await fetch("/api/live/channels", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load channels");
      }
      return (await response.json()) as ResolvedChannel[];
    }
  });
}

export function useCreateChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      name: string;
      channelPath: string;
      metadata?: Record<string, unknown>;
    }) => {
      const response = await fetch("/api/live/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Unable to create channel");
      }
      return (await response.json()) as ResolvedChannel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.liveChannels() });
    },
  });
}

export function useUpdateChannelMetadata() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, metadata }: { id: number; metadata: Record<string, unknown> }) => {
      const response = await fetch(`/api/live/channels/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Unable to update metadata");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.liveChannels() });
    },
  });
}

export function useDeleteChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { id: number }) => {
      const response = await fetch("/api/live/channels", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Unable to delete channel");
      }
      return (await response.json()) as Record<string, unknown>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.liveChannels() });
    },
  });
}

export type PodActionResult = {
  podName: string;
  podNode: string;
  status: number;
  message?: string;
  data: unknown;
};

async function runPodAction(
  pod: { name: string; linear?: Linear | null },
  actionId: string,
  token: string | null,
  deleteAction: "clear" | "delete" = "clear"
): Promise<PodActionResult> {
  const podName = pod.name;

  if (!["sync", "clean", "delete-flow"].includes(actionId)) {
    return { podName, podNode: podName, status: 200, data: { ok: true } };
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  if (actionId === "delete-flow") {
    if (!pod.linear || !pod.linear.linearName) {
      return { podName, podNode: podName, status: 200, data: { ok: true } };
    }
    const response = await fetch("/api/live/action", {
      method: "POST",
      headers,
      body: JSON.stringify({ actionId, podName, linearName: pod.linear.linearName, action: deleteAction }),
    });
    if (!response.ok) {
      const json = await response.json().catch(() => ({}));
      const msg = json?.message ?? `HTTP ${response.status}`;
      throw new Error(`Pod ${podName}: ${msg}`);
    }
    return { podName, podNode: podName, status: 200, data: { ok: true } };
  }

  // sync or clean
  const response = await fetch("/api/live/action", {
    method: "POST",
    headers,
    body: JSON.stringify({ actionId, podName, podNode: podName }),
  });

  const json = await response.json();

  if (!response.ok) {
    const msg = json?.message ?? `HTTP ${response.status}`;
    throw new Error(`Pod ${podName}: ${msg}`);
  }

  return { podName, podNode: podName, status: json.status ?? response.status, message: json.message, data: json.data };
}

export function useChannelAction() {
  return useMutation({
    mutationFn: async ({ channel, actionId }: { channel: ResolvedChannel; actionId: string }) => {
      const token = getToken();
      const podResults = await Promise.all(
        channel.pods.map((pod) => runPodAction(pod, actionId, token))
      );
      return { channelId: channel.id, actionId, podResults };
    }
  });
}

export function useBatchAction() {
  return useMutation({
    mutationFn: async ({ channels, actionId }: { channels: ResolvedChannel[]; actionId: string }) => {
      const token = getToken();
      const coreActionId = actionId.replace(/^batch-/, "");
      return Promise.all(
        channels.map(async (channel) => {
          try {
            await Promise.all(channel.pods.map((pod) => runPodAction(pod, coreActionId, token)));
            return { channelId: channel.id, actionId, status: "success" as const };
          } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            return { channelId: channel.id, actionId, status: "error" as const, error: msg };
          }
        })
      );
    }
  });
}

export function useBatchPodDelete() {
  return useMutation({
    mutationFn: async (pods: Array<{ name: string; linear: Linear | null }>) => {
      const token = getToken();
      return Promise.all(
        pods.map(async (pod) => {
          try {
            return await runPodAction(pod, "delete-flow", token, "clear");
          } catch (error) {
            return {
              podName: pod.name,
              podNode: pod.name,
              status: 0,
              data: { error: error instanceof Error ? error.message : "Failed" }
            } satisfies PodActionResult;
          }
        })
      );
    }
  });
}

export function usePlaybackDiagnostics() {
  return useMutation({
    mutationFn: async ({ url }: { url: string }) => {
      const response = await fetch("/api/live/diagnostics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });
      if (!response.ok) {
        throw new Error("Diagnostics failed");
      }
      return (await response.json()) as PlaybackDiagnostics;
    }
  });
}


export type ManifestCheck = { label: string; url: string; ok: boolean; httpStatus: number };
export type PodManifestResult = { podName: string; manifests: ManifestCheck[] };
export type ManifestStatusResult = { ok: boolean; pods: PodManifestResult[] };

export function useChannelManifestStatus(
  channelId: number,
  pods: { name: string; linear: { linearName: string | null } | null }[],
  originBaseUrl: string
) {
  return useQuery({
    queryKey: queryKeys.manifestStatus(String(channelId), originBaseUrl),
    queryFn: async (): Promise<ManifestStatusResult> => {
      const podsWithLinear = pods
        .filter((p): p is typeof p & { linear: { linearName: string } } => p.linear !== null && p.linear.linearName !== null)
        .map((p) => ({ podName: p.name, linearName: p.linear.linearName }));
      const uniquePods = Array.from(new Map(podsWithLinear.map((p) => [p.podName, p])).values());
      const response = await fetch("/api/live/manifest-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pods: uniquePods, originBaseUrl })
      });
      if (!response.ok) throw new Error("Manifest check failed");
      return response.json();
    },
    enabled: Boolean(originBaseUrl),
    staleTime: 2 * 60_000
  });
}

export type ConfigLayout = {
  configLayout: {
    Platform: Record<string, { Devices: string[] }>;
    Source?: { customizable: boolean; options?: string[] };
    Format?: { customizable: boolean; options?: string[] };
    Midroll?: { customizable: boolean; options?: string[] };
    DRM?: { customizable: boolean; options?: string[] };
    Token?: { customizable: boolean; options?: string[] };
    "Scte/ID3"?: { customizable: boolean; options?: string[] };
    Subtitle?: { customizable: boolean; options?: string[] };
    Multiaudio?: { customizable: boolean; options?: string[] };
    DrLecter?: { customizable: boolean; options?: string[] };
    [key: string]: unknown;
  };
};

export function useConfigLayoutQuery() {
  return useQuery({
    queryKey: queryKeys.liveConfigLayout(),
    queryFn: async () => {
      const response = await fetch("/api/live/config-layout", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load config layout");
      return (await response.json()) as ConfigLayout;
    },
    staleTime: Infinity,
  });
}

export function useVodManifestQuery(id: string, url: string | null, originBase: string) {
  return useQuery({
    queryKey: queryKeys.vodManifest(id, originBase),
    queryFn: async () => {
      const res = await fetch("/api/live/diagnostics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      return res.json() as Promise<{ status: string; httpStatus?: number }>;
    },
    enabled: Boolean(url),
    staleTime: 5 * 60_000,
  });
}

type AddLinearPayload = {
  channelEntityId: number;
  podName: string;
  linearName: string;
  drm: boolean;
  adsReplacement: boolean;
  fragmentLength: string;
  disableDrmManifests: boolean;
  drmVendor: string;
  contentId: string;
};

export function useAddLinear() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AddLinearPayload) => {
      const response = await fetch("/api/live/add-linear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        const err = new Error(json.message || `HTTP ${response.status}`);
        (err as Error & { curlCommand?: string }).curlCommand = json.curlCommand;
        throw err;
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.liveChannels() });
    },
  });
}

export function useDeleteLinearAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ podName, linearName, action }: { podName: string; linearName: string; action: "clear" | "delete" }) => {
      const response = await fetch("/api/live/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId: "delete-flow", podName, linearName, action }),
      });
      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(json.data?.msg ?? json.data?.message ?? json.message ?? `HTTP ${response.status}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.liveChannels() });
    },
  });
}

type UpdateChannelConfigPayload = {
  id: number;
  config: ChannelConfigRow[];
};

export function useUpdateChannelConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateChannelConfigPayload) => {
      const response = await fetch(`/api/live/channels/${payload.id}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: payload.config }),
      });
      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(json.message || `HTTP ${response.status}`);
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.liveChannels() });
    },
  });
}
