const HISTORY_KEY = "agiletv.history";

export type LocalHistoryItem = {
  id: string;
  actionId: string;
  title: string;
  status: "success" | "error" | "pending";
  createdAt: string;
  request: unknown;
  response?: unknown;
  error?: unknown;
};

const SENSITIVE_KEYS = ["token", "password", "authorization", "auth", "secret"];

export function maskSensitive(input: unknown): unknown {
  if (Array.isArray(input)) {
    return input.map(maskSensitive);
  }
  if (input && typeof input === "object") {
    return Object.entries(input as Record<string, unknown>).reduce<Record<string, unknown>>(
      (acc, [key, value]) => {
        if (SENSITIVE_KEYS.some((sensitive) => key.toLowerCase().includes(sensitive))) {
          acc[key] = "***";
        } else {
          acc[key] = maskSensitive(value);
        }
        return acc;
      },
      {}
    );
  }
  return input;
}

export function getLocalHistory(): LocalHistoryItem[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(HISTORY_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as LocalHistoryItem[];
  } catch {
    return [];
  }
}

export function addLocalHistory(item: LocalHistoryItem) {
  if (typeof window === "undefined") return;
  const next = [item, ...getLocalHistory()].slice(0, 200);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

export function clearLocalHistory() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(HISTORY_KEY);
}
