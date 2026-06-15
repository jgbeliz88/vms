import type { VodFilters } from "@/features/vod/vod-types";

export const queryKeys = {
  liveChannels: () => ["live-channels"],
  liveMediaexcelChannels: () => ["live-mediaexcel-channels"],
  liveConfigLayout: () => ["live-config-layout"],
  manifestStatus: (channelId: string, originBase: string) => ["manifest-status", channelId, originBase],
  channelDetailStatus: (channelId: string) => ["channel-detail-status", channelId],
  fastChannels: () => ["fast-channels"],
  fastChannelTransitions: (name: string) => ["fast-channel-transitions", name],
  fastChannelStreamStatus: (uri: string) => ["fast-channel-stream-status", uri],
  bitmovinVod: (filters: VodFilters) => ["bitmovin-vod", filters] as const,
  lightflowVod: (filters: VodFilters) => ["lightflow-vod", filters] as const,
  vodManifest: (id: string, originBase: string) => ["vod-manifest", id, originBase],
  health: () => ["health"],
  history: (page: number, pageSize: number) => ["history", page, pageSize],
  vmsSettings: () => ["vms-settings"],
};
