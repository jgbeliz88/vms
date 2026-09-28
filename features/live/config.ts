import { ChannelAction } from "./types";
import { PERMISSIONS } from "@/lib/auth/permissions";

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
    id: "move",
    label: "Move to Channel",
    description: "Reassign the selected linears to another live channel.",
    tone: "default",
    requiresConfirm: true,
    allowedPermissions: [PERMISSIONS.LIVE_MANAGE_LINEARS]
  }
];

