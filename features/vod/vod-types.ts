export type PaginatedVodResponse<T> = {
  items: T[];
  pageIndex: number;
  pageSize: number;
  hasNextPage: boolean;
};

export type VodFilters = {
  page: number;
  limit: number;
  sortBy?: string;
  order?: "asc" | "desc";
  id?: string;
  status?: string;
  createdAtOlderThan?: string;
  createdAtNewerThan?: string;
  name?: string;
  labels?: string[];
};

export type VodContent = {
  _id: string;
  name: string;
  status: string;
  labels: string[];
  createdAt: string;
  modifiedAt: string;
  startedAt: string;
  finishedAt: string;
  title: string | null;
  input?: {
    videos: { duration: number; codec: string; fps: string; bitrate: string; width: number; height: number; par: number }[];
    audios: { codec: string; sampleRate: number; bitrate: string; channelFormat: string; language: string; duration: number; hearingImpaired: boolean }[];
    formatName: string;
    duration: number;
    size: number;
    bitrate: number;
  };
  renditions?: {
    mimeType: string;
    fileSize: number;
    filename: string;
    duration: number;
    videoTracks: { index: number; codec: string; frameWidth: number; frameHeight: number; bitRate: number; frameRate: string; aspectRatio: string }[];
    audioTracks: { index: number; codec: string; bitRate: number; sampleRate: number; channels: number }[];
  }[];
  subtitles?: { lang: string; url?: string }[];
};

/**
 * A row of the shared VOD configuration table. Unlike Live, this config is global —
 * the same collection is read/written by every VOD's detail view.
 *
 * `platform` and `device` are always present (they identify the row). The remaining
 * fields are UI strings: booleans coming from the backend (`drm`, `subt`, `multiaudio`,
 * `drLecter`) are surfaced as "Yes" / "No" / "" so they can reuse the shared Yes/No
 * dropdown options and the N/A rendering. Empty string means N/A.
 */
export type VodConfigRow = {
  platform: string;
  device: string;
  format?: string;
  drm?: string;
  token?: string;
  subt?: string;
  multiaudio?: string;
  drLecter?: string;
};

export const VOD_CONFIG_COLUMNS: { key: keyof VodConfigRow; label: string }[] = [
  { key: "platform",   label: "Platform"  },
  { key: "device",     label: "Device"    },
  { key: "format",     label: "Format"    },
  { key: "drm",        label: "DRM"       },
  { key: "token",      label: "Token"     },
  { key: "subt",       label: "Subt"      },
  { key: "multiaudio", label: "Multiaudio"},
  { key: "drLecter",   label: "Dr Lecter" },
];
