import { Channel } from "./types";

export const mockChannels: Channel[] = [
  {
    id: "ch-001",
    name: "News Live",
    channelPath: "news-live",
    platform: "HLS",
    status: "ok",
    cacheState: "warm",
    lastSync: "2026-02-06T08:42:00Z",
    linears: [],
    metadata: {
      owner: "Ops",
      bitrate: "6 Mbps",
      ingest: "rtmp://ingest/news-live",
      profile: "primary",
      statusParts: {
        encoding: "ok",
        origin: "ok",
        cdn: "ok"
      }
    }
  },
  {
    id: "ch-002",
    name: "Sports Arena",
    channelPath: "sports-arena",
    platform: "DASH",
    status: "warning",
    cacheState: "stale",
    lastSync: "2026-02-06T08:12:00Z",
    linears: [],
    metadata: {
      owner: "Sports",
      bitrate: "8 Mbps",
      ingest: "srt://ingest/sports",
      profile: "backup",
      statusParts: {
        encoding: "ok",
        origin: "warning",
        cdn: "ok"
      }
    }
  },
  {
    id: "ch-003",
    name: "Kids Zone",
    channelPath: "kids-zone",
    platform: "HLS",
    status: "error",
    cacheState: "cold",
    lastSync: "2026-02-06T07:40:00Z",
    linears: [],
    metadata: {
      owner: "Content",
      bitrate: "4 Mbps",
      ingest: "rtmp://ingest/kids",
      profile: "primary",
      statusParts: {
        encoding: "error",
        origin: "error",
        cdn: "warning"
      }
    }
  }
];
