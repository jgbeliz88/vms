import { NextResponse } from "next/server";
import { z } from "zod";
import { getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";
import { logInfo, logError } from "@/app/api/_lib/logger";
import { extractUpstreamMessage } from "@/app/api/_lib/responses";
import type { VodConfigRow } from "@/features/vod/vod-types";

const LOG_NAME = "app.api.vod.config.route";

/** Backend row shape returned by GET /vod/config. */
type EnigmaVodConfigRow = {
  _id?: string;
  __v?: number;
  platform: string;
  device: string;
  format?: string | null;
  drm?: boolean | null;
  token?: string | null;
  subt?: boolean | null;
  multiaudio?: boolean | null;
  drLecter?: boolean | null;
};

/** boolean | null → "Yes" | "No" | "" (empty → N/A in the UI). */
function boolToUi(value: boolean | null | undefined): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "";
}

/** "Yes"/"No" → boolean, anything else → undefined (field omitted). */
function uiToBool(value: string | null | undefined): boolean | undefined {
  if (value === "Yes") return true;
  if (value === "No") return false;
  return undefined;
}

/** Map a backend row to the UI string row used by the config table. */
function toUiRow(row: EnigmaVodConfigRow): VodConfigRow {
  return {
    platform: row.platform,
    device: row.device,
    format: row.format ?? "",
    token: row.token ?? "",
    drm: boolToUi(row.drm),
    subt: boolToUi(row.subt),
    multiaudio: boolToUi(row.multiaudio),
    drLecter: boolToUi(row.drLecter),
  };
}

/**
 * Build the backend payload for a UI row. Only `platform` and `device` are required;
 * every other field is omitted when empty/N/A (never defaulted).
 */
function toEnigmaRow(row: VodConfigRow): Record<string, unknown> {
  const out: Record<string, unknown> = { platform: row.platform, device: row.device };
  if (row.format) out.format = row.format;
  if (row.token) out.token = row.token;
  const drm = uiToBool(row.drm);
  if (drm !== undefined) out.drm = drm;
  const subt = uiToBool(row.subt);
  if (subt !== undefined) out.subt = subt;
  const multiaudio = uiToBool(row.multiaudio);
  if (multiaudio !== undefined) out.multiaudio = multiaudio;
  const drLecter = uiToBool(row.drLecter);
  if (drLecter !== undefined) out.drLecter = drLecter;
  return out;
}

const rowSchema = z.object({
  platform: z.string().min(1),
  device: z.string().min(1),
  format: z.string().nullish(),
  drm: z.string().nullish(),
  token: z.string().nullish(),
  subt: z.string().nullish(),
  multiaudio: z.string().nullish(),
  drLecter: z.string().nullish(),
});

const bodySchema = z.object({
  config: z.array(rowSchema),
});

export async function GET() {
  const url = `${getEnigmaBaseUrl()}/vod/config`;
  let response: Response;
  try {
    response = await fetchVMS(url, { method: "GET" });
  } catch (error) {
    logError({ name: LOG_NAME, fn: "GET", msg: `Fetch failed url=${url}`, error });
    return NextResponse.json({ message: String(error) }, { status: 500 });
  }

  if (!response.ok) {
    const text = await response.text();
    logError({ name: LOG_NAME, fn: "GET", msg: `Non-OK response url=${url}`, error: new Error(`HTTP ${response.status}: ${text}`) });
    return NextResponse.json({ message: extractUpstreamMessage(text, response.status) }, { status: response.status });
  }

  const data = (await response.json()) as EnigmaVodConfigRow[];
  const rows = Array.isArray(data) ? data.map(toUiRow) : [];
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    logError({ name: LOG_NAME, fn: "POST", msg: "Invalid request payload", error: parsed.error });
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const config = parsed.data.config.map((row) => toEnigmaRow(row as VodConfigRow));

  const url = `${getEnigmaBaseUrl()}/vod/config`;
  let response: Response;
  try {
    response = await fetchVMS(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config }),
    });
  } catch (error) {
    logError({ name: LOG_NAME, fn: "POST", msg: `Fetch failed url=${url}`, error });
    return NextResponse.json({ message: String(error) }, { status: 500 });
  }

  if (!response.ok) {
    const text = await response.text();
    logError({ name: LOG_NAME, fn: "POST", msg: `Non-OK response url=${url}`, error: new Error(`HTTP ${response.status}: ${text}`) });
    return NextResponse.json({ message: extractUpstreamMessage(text, response.status) }, { status: response.status });
  }

  const data = await response.json();
  logInfo({ name: LOG_NAME, fn: "POST", msg: "Enigma response", data });
  return NextResponse.json(data, { status: 201 });
}
