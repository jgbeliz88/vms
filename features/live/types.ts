import type { Permission } from "@/lib/auth/permissions";

export type ChannelStatus = "ok" | "warning" | "error";

// Shape from Enigma GET /live/channels — linearName is null when the linear has been cleared
export type Linear = {
  podId: number;
  channelId: number;
  linearName: string | null;
  drm: number | null;
  adsReplacement: number | null;
  fragmentLength: string | null;
  disableDrmManifests: number | null;
  drmVendor: string | null;
  contentId: string | null;
};

// ── Mediaexcel channel type (from GET /mediaexcel/channels) ──────────────────

export type MediaexcelChannel = {
  id: number;
  deviceId: number;
  encoderName: string;
  name: string;
  channelIndex: number;
  pods: string[];
};

// ── Enigma nested linear types (preserved hierarchy from GET /live/channels) ─

export type EnigmaEncoder = {
  id: number;
  name: string;
  heroName: string;
  deviceId: number;
  channelIndex: number;
  updatedAt: string;
};

export type EnigmaLinearPod = {
  id: number;
  name: string;
  status: "running" | "stopped" | "degraded";
  linearId: number;
  updatedAt: string;
  encoders: EnigmaEncoder[];
};

export type EnigmaLinear = {
  id: number;
  channelId: number;
  name: string | null;
  drm: number | null;
  adsReplacement: number | null;
  fragmentLength: string | null;
  disableDrmManifests: number | null;
  drmVendor: string | null;
  contentId: string | null;
  tags: string[];
  updatedAt: string;
  pods: EnigmaLinearPod[];
};

// Runtime-resolved view (joined by BFF from /live/channels response) — used by UI
export type ResolvedPod = {
  id: number;
  name: string;
  status: "running" | "stopped" | "degraded";
  encoderId: number;
  encoderName: string;
  linear: Linear | null;
};

// Channel shape from Enigma API
export type Channel = {
  id: number;
  name: string;
  status: ChannelStatus;
  linears: Linear[];
  cacheState: "warm" | "cold" | "stale";
  lastSync: string | null;
  metadata: Record<string, unknown> | null;
  channelConfigs: ChannelConfigRow[];
};

// Shape returned by GET /api/live/channels (pods joined from encoder data)
export type ResolvedChannel = Omit<Channel, "linears" | "channelConfigs"> & {
  pods: ResolvedPod[];
  linears: EnigmaLinear[];
  config?: ChannelConfigRow[];
};

export type ChannelConfigRow = {
  channelId?: number;
  platform: string;
  device: string;
  source?: string;
  cvpId?: string;
  format?: string;
  midroll?: string;
  drm?: string;
  encoder?: string;
  pod?: string;
  linear?: string;
  token?: string;
  scteId3?: string;
  subtitle?: string;
  multiaudio?: string;
  drLecter?: string;
};

/**
 * Single source of truth for channel config column order and labels.
 * Every table that renders ChannelConfigRow data (read-only or editable) derives
 * its columns from this list. To add a new column:
 *   1. Add the key to ChannelConfigRow above.
 *   2. Add an entry here — it will appear in ALL tables automatically.
 *   3. If the column should be editable in ChannelConfigEditor, also add an entry
 *      to EDITOR_SPECS in components/live/ChannelConfigEditor.tsx.
 */
export const CHANNEL_CONFIG_COLUMNS: { key: keyof ChannelConfigRow; label: string }[] = [
  { key: "platform",   label: "Platform"  },
  { key: "device",     label: "Device"    },
  { key: "source",     label: "Source"    },
  { key: "cvpId",      label: "CVP ID"    },
  { key: "format",     label: "Format"    },
  { key: "midroll",    label: "Midroll"   },
  { key: "drm",        label: "DRM"       },
  { key: "encoder",    label: "Encoder"   },
  { key: "linear",     label: "Linear"    },
  { key: "token",      label: "Token"     },
  { key: "scteId3",    label: "SCTE/ID3"  },
  { key: "subtitle",   label: "Subt"      },
  { key: "multiaudio", label: "Multiaudio"},
  { key: "drLecter",   label: "Dr Lecter" },
];

export type ChannelAction = {
  id: string;
  label: string;
  description: string;
  tone: "default" | "warning" | "danger";
  requiresConfirm: boolean;
  requireNameMatch?: boolean;
  allowedPermissions?: Permission[]; // if omitted → unrestricted
};

export type PlaybackMode = "direct" | "cdn";

export type PlaybackDiagnostics = {
  url: string;
  status: "ready" | "error" | "loading";
  httpStatus?: number;
  contentType?: string;
  manifest?: string;
  error?: string;
};

export type BatchAction = {
  id: string;
  label: string;
  description: string;
  tone: "default" | "warning" | "danger";
};

export type LinearBatchResult = {
  linearId: number;
  linearName: string | null;
  channelId: number;
  channelName: string;
  tags: string[];
  status: "success" | "error";
  data?: unknown;
  error?: string;
};
