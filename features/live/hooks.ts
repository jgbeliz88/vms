import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ResolvedChannel, Linear, PlaybackDiagnostics, ChannelConfigRow, LinearBatchResult } from "./types";
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

  return postPodLinearAction(podName, linearName, actionId, token);
}

export async function postPodLinearAction(
  podName: string,
  linearName: string,
  actionId: string,
  token: string | null
): Promise<PodActionResult> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

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

export type PodLinearTarget = { podName: string; linearName: string };

export function usePodLinearActions() {
  return useMutation({
    mutationFn: async ({ actionId, targets }: { actionId: "sync" | "clean"; targets: PodLinearTarget[] }) => {
      const token = getToken();
      return Promise.all(
        targets.map((t) => postPodLinearAction(t.podName, t.linearName, actionId, token))
      );
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
    mutationFn: async ({ url }: { url: string }): Promise<PlaybackDiagnostics> => {
      // Fetch the manifest directly from the browser so the probe carries the
      // same Origin/Referer and client IP as the player, which already loads it
      // successfully. A server-side fetch from the pod is rejected by the CDN
      // (no browser Referer, different egress IP) even when playback works.
      // Matches the player's `crossOrigin="anonymous"` — CORS, no credentials.
      try {
        const response = await fetch(url, { cache: "no-store" });
        const httpStatus = response.status;
        if (httpStatus >= 400) {
          return { url, status: "error", httpStatus, error: `HTTP ${httpStatus}` };
        }
        const manifest = await response.text();
        return { url, status: "ready", httpStatus, manifest };
      } catch (clientError) {
        // Browser fetch failed (likely CORS or a network error). Fall back to
        // the server-side diagnostics route so we still surface a status.
        try {
          const response = await fetch("/api/live/diagnostics", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url })
          });
          if (response.ok) {
            return (await response.json()) as PlaybackDiagnostics;
          }
        } catch {
          // Ignore — surface the original client-side error below.
        }
        return {
          url,
          status: "error",
          error: clientError instanceof Error ? clientError.message : "Diagnostics failed"
        };
      }
    }
  });
}


// `blocked`: Origin main manifest intentionally 403'd while Origin (DRM) and CDN serve — excluded from `ok`.
export type ChannelDetailManifestCheck = { label: string; url: string; ok: boolean; httpStatus: number; blocked: boolean };
export type ChannelDetailSection = { ok: boolean; manifests: ChannelDetailManifestCheck[] };
// One entry per orilinear. `originDrm.manifests` is empty for non-DRM linears.
export type LinearStatusResult = {
  orilinear: string;
  linearName: string;
  drm: number | null;
  originBlocked: boolean;
  origin: ChannelDetailSection;
  originDrm: ChannelDetailSection;
  cdn: ChannelDetailSection;
  ok: boolean;
};
export type ChannelDetailStatusResult = { linears: LinearStatusResult[] };

export function useChannelDetailStatus(
  channelId: number,
  pods: { name: string; linear: { linearName: string | null; drm: number | null } | null }[],
  originBaseUrl: string,
  cdnBaseUrl: string
) {
  return useQuery({
    queryKey: queryKeys.channelDetailStatus(String(channelId)),
    queryFn: async (): Promise<ChannelDetailStatusResult> => {
      const podsWithLinear = pods
        .filter((p): p is typeof p & { linear: { linearName: string; drm: number | null } } =>
          p.linear !== null && p.linear.linearName !== null
        )
        .map((p) => ({ podName: p.name, linearName: p.linear.linearName, drm: p.linear.drm }));
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

type LinearAdEventResult = {
  linearId: number;
  encoderName: string;
  status: "fulfilled" | "rejected";
  error?: string;
};

export function useSendLinearAdEvent() {
  return useMutation({
    mutationFn: async (vars: {
      linearIds: number[];
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
      return res.json() as Promise<{ results: LinearAdEventResult[] }>;
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

type UpdateLinearPayload = {
  linearId: number;
  tags?: string[];
  pods?: { name: string; encoders: number[] }[];
};

// Only send the fields that changed; undefined keys are dropped by JSON.stringify.
export function useUpdateLinear() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ linearId, tags, pods }: UpdateLinearPayload) => {
      const token = getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const response = await fetch(`/api/live/linear/${linearId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ tags, pods }),
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

// ── Batch linear actions (linear-centric, operate on EnigmaLinear.id) ────────

type BatchLinearInput = {
  linearId: number;
  linearName: string | null;
  channelId: number;
  channelName: string;
  tags: string[];
};

async function runLinearSimpleAction(
  linearId: number,
  endpoint: string,
  token: string | null
): Promise<{ ok: boolean; data: unknown; error?: string }> {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  try {
    const res = await fetch(`/api/live/linear/${linearId}/${endpoint}`, { method: "GET", headers });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = (data as Record<string, unknown>)?.message ?? `HTTP ${res.status}`;
      return { ok: false, data, error: String(msg) };
    }
    return { ok: true, data };
  } catch (err) {
    return { ok: false, data: null, error: err instanceof Error ? err.message : String(err) };
  }
}

export function useBatchLinearSync() {
  return useMutation({
    mutationFn: async (linears: BatchLinearInput[]): Promise<LinearBatchResult[]> => {
      const token = getToken();
      return Promise.all(
        linears.map(async (l) => {
          const { ok, data, error } = await runLinearSimpleAction(l.linearId, "sync", token);
          return { ...l, status: ok ? ("success" as const) : ("error" as const), data, error };
        })
      );
    },
  });
}

export function useBatchLinearClean() {
  return useMutation({
    mutationFn: async (linears: BatchLinearInput[]): Promise<LinearBatchResult[]> => {
      const token = getToken();
      return Promise.all(
        linears.map(async (l) => {
          const { ok, data, error } = await runLinearSimpleAction(l.linearId, "clean", token);
          return { ...l, status: ok ? ("success" as const) : ("error" as const), data, error };
        })
      );
    },
  });
}

export function useBatchLinearClear() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (linears: BatchLinearInput[]): Promise<LinearBatchResult[]> => {
      const token = getToken();
      return Promise.all(
        linears.map(async (l) => {
          const { ok, data, error } = await runLinearSimpleAction(l.linearId, "disable", token);
          return { ...l, status: ok ? ("success" as const) : ("error" as const), data, error };
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.liveChannels() });
    },
  });
}

export function useBatchLinearMove() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      linears,
      targetChannelId,
    }: {
      linears: BatchLinearInput[];
      targetChannelId: number;
    }): Promise<LinearBatchResult[]> => {
      const token = getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      return Promise.all(
        linears.map(async (l) => {
          try {
            const res = await fetch(`/api/live/linear/${l.linearId}`, {
              method: "PUT",
              headers,
              body: JSON.stringify({ channelId: targetChannelId }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) {
              const msg = (data as Record<string, unknown>)?.message ?? `HTTP ${res.status}`;
              return { ...l, status: "error" as const, data, error: String(msg) };
            }
            return { ...l, status: "success" as const, data };
          } catch (err) {
            return {
              ...l,
              status: "error" as const,
              data: null,
              error: err instanceof Error ? err.message : String(err),
            };
          }
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.liveChannels() });
    },
  });
}

type BatchLinearCreateInput = BatchLinearInput & {
  name: string;
};

type BatchLinearCreateConfig = {
  drm: boolean;
  adsReplacement: boolean;
  fragmentLength: string;
  disableDrmManifests: boolean;
  drmVendor: string;
  contentId: string;
};

export function useBatchLinearCreate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      linears,
      config,
    }: {
      linears: BatchLinearCreateInput[];
      config: BatchLinearCreateConfig;
    }): Promise<LinearBatchResult[]> => {
      const token = getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      return Promise.all(
        linears.map(async (l) => {
          try {
            const res = await fetch(`/api/live/linear/${l.linearId}/activate`, {
              method: "PATCH",
              headers,
              body: JSON.stringify({
                channelId: l.channelId,
                name: l.name,
                drm: config.drm,
                adsReplacement: config.adsReplacement,
                fragmentLength: config.fragmentLength,
                disableDrmManifests: config.disableDrmManifests,
                drmVendor: config.drmVendor,
                contentId: config.contentId,
                tags: l.tags,
              }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) {
              const msg = (data as Record<string, unknown>)?.message ?? `HTTP ${res.status}`;
              return { ...l, linearName: l.name, status: "error" as const, data, error: String(msg) };
            }
            return { ...l, linearName: l.name, status: "success" as const, data };
          } catch (err) {
            return {
              ...l,
              linearName: l.name,
              status: "error" as const,
              data: null,
              error: err instanceof Error ? err.message : String(err),
            };
          }
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.liveChannels() });
    },
  });
}
