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
