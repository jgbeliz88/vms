import { BatchAction, ChannelAction } from "./types";

export const channelActions: ChannelAction[] = [
  {
    id: "sync",
    label: "Synchronize",
    description: "Force a metadata + cache sync on this channel.",
    tone: "default",
    requiresConfirm: true
  },
  {
    id: "clean",
    label: "Clean Channel",
    description: "Clear derived artifacts and rebuild cache.",
    tone: "warning",
    requiresConfirm: true
  },
  {
    id: "descache",
    label: "Descache",
    description: "Purge cache entries and reload origin data.",
    tone: "warning",
    requiresConfirm: true
  }
];

export const batchActions: BatchAction[] = [
  {
    id: "batch-sync",
    label: "Synchronize",
    description: "Sync all selected channels.",
    tone: "default"
  },
  {
    id: "batch-descache",
    label: "Descache",
    description: "Purge cache for selected channels.",
    tone: "default"
  },
  {
    id: "batch-clean",
    label: "Clean Channels",
    description: "Clean and rebuild selected channels.",
    tone: "danger"
  }
];
