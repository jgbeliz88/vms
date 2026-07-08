import { ChannelAction } from "./types";

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
  }
];

