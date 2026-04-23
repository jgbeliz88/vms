import type { Role } from "@/lib/auth/permissions";

export type ChannelStatus = "ok" | "warning" | "error";

export type Linear = {
  linearName: string;
  drm: boolean;
  adsReplacement: boolean;
  fragmentLength: string;
  disableDrmManifests: boolean;
  drmVendor: string;
  contentId: string;
};

// ── Encoder / Pod infrastructure types ────────────────────────────────────────

export type EncoderPod = {
  id: number;
  name: string;
  status: "running" | "stopped" | "degraded";
  encoderId: number;
};

export type Encoder = {
  id: number;
  encoderChannel: string;
  heroName: string;
  pods: EncoderPod[];
};

// Reference stored inside each channel (raw storage format)
export type ChannelEncoderPodRef = {
  encoderId: number;
  podId: number;
  linear: Linear | null;
};

// Runtime-resolved view (joined by BFF) — used by UI
export type ResolvedPod = EncoderPod & {
  encoderName: string;
  linear: Linear | null;
};

// Internal channel shape (written to / read from JSON store)
export type Channel = {
  id: string;
  name: string;
  channelPath?: string;
  platform: string;
  status: ChannelStatus;
  linears: ChannelEncoderPodRef[];
  cacheState: "warm" | "cold" | "stale";
  lastSync: string;
  metadata: Record<string, unknown>;
  config?: ChannelConfigRow[];
};

// Shape returned by the GET /api/live/channels endpoint (pods joined from encoder store)
export type ResolvedChannel = Omit<Channel, "linears"> & {
  pods: ResolvedPod[];
};

export type ChannelConfigRow = {
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
  allowedRoles?: Role[]; // if omitted → unrestricted
};

export type PlaybackMode = "direct" | "caronte";

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
