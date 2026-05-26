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
  linearName?: string;
  status: number;
  message?: string;
  data: unknown;
  error?: string;
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
  const linearName = pod.linear?.linearName ?? undefined;
  if (!linearName) {
    return { podName, podNode: podName, linearName, status: 200, data: { ok: true } };
  }

  try {
    const response = await fetch("/api/live/action", {
      method: "POST",
      headers,
      body: JSON.stringify({ actionId, podName, linearName }),
    });

    const json = await response.json();

    if (!response.ok) {
      const msg = json?.message ?? `HTTP ${response.status}`;
      return { podName, podNode: podName, linearName, status: response.status, data: json, error: msg };
    }

    return { podName, podNode: podName, linearName, status: json.status ?? response.status, message: json.message, data: json.data };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { podName, podNode: podName, linearName, status: 0, data: null, error: msg };
  }
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
            const podResults = await Promise.all(
              channel.pods.map((pod) => runPodAction(pod, coreActionId, token))
            );
            const hasPodError = podResults.some((r) => r.error);
            return {
              channelId: channel.id,
              actionId,
              status: hasPodError ? "error" as const : "success" as const,
              podResults,
            };
          } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            return { channelId: channel.id, actionId, status: "error" as const, podResults: [] as PodActionResult[], error: msg };
          }
        })
      );
    }
  });
}

export function useBatchPodDelete() {
  const queryClient = useQueryClient();
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.liveChannels() });
    },
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

export type ChannelDetailManifestCheck = { label: string; url: string; ok: boolean; httpStatus: number };
export type ChannelDetailPodResult = { orilinear: string; manifests: ChannelDetailManifestCheck[] };
export type ChannelDetailSection = { ok: boolean; pods: ChannelDetailPodResult[] };
export type ChannelDetailStatusResult = {
  origin: ChannelDetailSection;
  originDrm: ChannelDetailSection;
  cdn: ChannelDetailSection;
};

export function useChannelDetailStatus(
  channelId: number,
  pods: { name: string; linear: { linearName: string | null } | null }[],
  originBaseUrl: string,
  cdnBaseUrl: string
) {
  return useQuery({
    queryKey: queryKeys.channelDetailStatus(String(channelId)),
    queryFn: async (): Promise<ChannelDetailStatusResult> => {
      const podsWithLinear = pods
        .filter((p): p is typeof p & { linear: { linearName: string } } =>
          p.linear !== null && p.linear.linearName !== null
        )
        .map((p) => ({ podName: p.name, linearName: p.linear.linearName }));
      const res = await fetch("/api/live/channel-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pods: podsWithLinear, originBaseUrl, cdnBaseUrl }),
      });
      if (!res.ok) throw new Error("Channel status check failed");
      return res.json();
    },
    enabled: Boolean(originBaseUrl && cdnBaseUrl),
  });
}

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
  });
}

type AddLinearPayload = {
  channelId: number;
  name: string;
  drm: boolean;
  adsReplacement: boolean;
  fragmentLength: string;
  disableDrmManifests: boolean;
  drmVendor: string;
  contentId: string;
  tags: string[];
  pods: { name: string; encoders: number[] }[];
};

type ConfigureLinearPayload = {
  linearId: number;
  channelId: number;
  name: string;
  drm: boolean;
  adsReplacement: boolean;
  fragmentLength: string;
  disableDrmManifests: boolean;
  drmVendor: string;
  contentId: string;
  tags: string[];
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
        let json: Record<string, unknown> = {};
        let rawText = "";
        try {
          rawText = await response.text();
          json = JSON.parse(rawText);
        } catch {
          // non-JSON body (e.g. load balancer error)
        }
        const message = (json.message as string) || (rawText ? `HTTP ${response.status}: ${rawText}` : `HTTP ${response.status}`);
        const err = new Error(message);
        (err as Error & { curlCommand?: string }).curlCommand = json.curlCommand as string | undefined;
        throw err;
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.liveChannels() });
    },
  });
}

type JulesEventResult = { julesId: string; success: boolean; error?: string };

export function useSendJulesEvent() {
  return useMutation({
    mutationFn: async (vars: {
      julesIds: string[];
      command: "scte" | "admode" | "blackout";
      payload: string;
    }) => {
      const token = getToken();
      const res = await fetch("/api/live/jules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(vars),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      return res.json() as Promise<{ results: JulesEventResult[] }>;
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

export function useDeletePodReference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ podName }: { podName: string }) => {
      const response = await fetch(`/api/live/linears/${podName}`, {
        method: "DELETE",
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

export function useDeleteLinear() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (linearId: number) => {
      const response = await fetch(`/api/live/linear/${linearId}/delete`, { method: "DELETE" });
      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(json.message ?? `HTTP ${response.status}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.liveChannels() });
    },
  });
}

export function useClearLinear() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (linearId: number) => {
      const response = await fetch(`/api/live/linear/${linearId}/disable`, { method: "GET" });
      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(json.message ?? `HTTP ${response.status}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.liveChannels() });
    },
  });
}

export function useConfigureLinear() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ linearId, ...body }: ConfigureLinearPayload) => {
      const response = await fetch(`/api/live/linear/${linearId}/activate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(json.message ?? `HTTP ${response.status}`);
      }
      return await response.json();
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
