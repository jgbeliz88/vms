import { ChannelStatus } from "./types";

export function toOrilinear(podName: string): string {
  return podName.replace(/^usp/, "").replace(/[mb]$/, "");
}

export type StatusParts = {
  encoding: ChannelStatus;
  origin: ChannelStatus;
  cdn: ChannelStatus;
};

export function deriveStatusParts(input: unknown, fallback: ChannelStatus): StatusParts {
  if (input && typeof input === "object") {
    const maybe = input as Partial<StatusParts>;
    if (maybe.encoding && maybe.origin && maybe.cdn) {
      return {
        encoding: maybe.encoding,
        origin: maybe.origin,
        cdn: maybe.cdn
      };
    }
  }
  return { encoding: fallback, origin: fallback, cdn: fallback };
}

export function deriveOverallStatus(parts: StatusParts): ChannelStatus {
  if (parts.encoding === "error" || parts.origin === "error" || parts.cdn === "error") {
    return "error";
  }
  if (parts.encoding === "warning" || parts.origin === "warning" || parts.cdn === "warning") {
    return "warning";
  }
  return "ok";
}
