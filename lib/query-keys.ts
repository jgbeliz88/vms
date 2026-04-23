export const queryKeys = {
  liveChannels: () => ["live-channels"],
  liveEncoders: () => ["live-encoders"],
  liveConfigLayout: () => ["live-config-layout"],
  manifestStatus: (channelId: string, originBase: string) => ["manifest-status", channelId, originBase],
  fastChannels: () => ["fast-channels"],
  fastChannelTransitions: (name: string) => ["fast-channel-transitions", name],
  fastChannelStreamStatus: (uri: string) => ["fast-channel-stream-status", uri],
  bitmovinVod: () => ["bitmovin-vod"],
  lightflowVod: () => ["lightflow-vod"],
  vodManifest: (id: string, originBase: string) => ["vod-manifest", id, originBase],
  health: () => ["health"],
  history: (page: number, pageSize: number) => ["history", page, pageSize],
} as const;
