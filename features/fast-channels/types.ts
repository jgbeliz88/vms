export type FastChannel = {
  name: string;
  uri: string;
};

export type FastChannelTransitions = Record<string, string>;

export type CronJob = {
  id: string;
  type: string;
  created_at: string;
  method: string;
  path: string;
  executionTime: string;
  /** Only present when the cron job is fetched with includeBody=true. */
  body?: string;
};

/** A cron job resolved to the channel it belongs to. */
export type ChannelCronJob = CronJob & {
  transitionName: string;
};

/**
 * One platform/device row of a fast channel's configuration. Values are UI strings —
 * empty string means N/A. `batchId`, `channelName`, `encoder`, `linear` and `updatedAt`
 * are stripped by the API route: the first two are supplied on save, the rest unused.
 */
export type FastChannelConfigRow = {
  platform: string;
  device: string;
  source?: string;
  cvpId?: string;
  format?: string;
  midroll?: string;
  drm?: string;
  token?: string;
  scteId3?: string;
  subtitle?: string;
  multiaudio?: string;
  drLecter?: string;
};

export const FAST_CHANNEL_CONFIG_COLUMNS: { key: keyof FastChannelConfigRow; label: string }[] = [
  { key: "platform",   label: "Platform"   },
  { key: "device",     label: "Device"     },
  { key: "source",     label: "Source"     },
  { key: "cvpId",      label: "CVP ID"     },
  { key: "format",     label: "Format"     },
  { key: "midroll",    label: "Midroll"    },
  { key: "drm",        label: "DRM"        },
  { key: "token",      label: "Token"      },
  { key: "scteId3",    label: "SCTE/ID3"   },
  { key: "subtitle",   label: "Subt"       },
  { key: "multiaudio", label: "Multiaudio" },
  { key: "drLecter",   label: "Dr Lecter"  },
];

/** The value fields of a config row — everything except the platform/device key. */
export const FAST_CHANNEL_CONFIG_FIELDS = [
  "source", "cvpId", "format", "midroll", "drm",
  "token", "scteId3", "subtitle", "multiaudio", "drLecter",
] as const;

/** A row carries data once at least one field beyond its platform/device key is set. */
export function hasAnyConfigValue(row: FastChannelConfigRow): boolean {
  return FAST_CHANNEL_CONFIG_FIELDS.some((field) => Boolean(row[field]));
}

/** A fast-channel batch. The batch whose name equals the channel name supplies its batchId. */
export type FastChannelBatch = {
  id: number;
  name: string;
};
