import type { EntraSession } from "@/lib/session/types";

export const PERMISSIONS = {
  ACCESS_APP:            "vms_access_app",
  SETTINGS_PAGE:         "vms_settings_page",
  CDN_PAGE:              "vms_cdn_page",
  VOD_ACTIONS:           "vms_vod_actions",
  FC_MANAGE_CHANNELS:    "vms_fc_manage_channels",
  FC_MANAGE_TRANSITIONS: "vms_fc_manage_transitions",
  LIVE_MANAGE_LINEARS:   "vms_live_manage_linears",
  LINEAR_ACTIONS:        "vms_linear_actions",
  LIVE_MANAGE_CHANNELS:  "vms_live_manage_channels",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export function hasPermission(user: EntraSession["user"] | null, allowed: Permission[]): boolean {
  if (!user) return false;
  return allowed.some((p) => user.roles.includes(p));
}
