import type { MediaexcelChannel } from "./types";

export type PodActionId = "sync" | "clean";

export const podActions: { id: PodActionId; label: string; description: string; doneTitle: string }[] = [
  { id: "sync", label: "Synchronize", description: "Force a metadata + cache sync on the selected pods.", doneTitle: "Pods synchronized" },
  { id: "clean", label: "Clean", description: "Clear derived artifacts and rebuild cache.", doneTitle: "Pods cleaned" },
];

// Default linear name for a pod: "usporilinear01a" → "linear01".
export function deriveLinearName(podName: string): string {
  return podName.replace(/^uspori/, "").replace(/[a-z]$/i, "");
}

export type InventoryPod = { pod: string; channel: string; encoder: string };

// Flattens the Mediaexcel inventory to one row per pod, keeping the first
// encoder/channel a pod appears under.
export function flattenInventory(channels: MediaexcelChannel[]): InventoryPod[] {
  const seen = new Set<string>();
  const rows: InventoryPod[] = [];
  for (const c of channels) {
    for (const pod of c.pods) {
      if (seen.has(pod)) continue;
      seen.add(pod);
      rows.push({ pod, channel: c.name, encoder: c.encoderName });
    }
  }
  return rows;
}
