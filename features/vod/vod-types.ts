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
