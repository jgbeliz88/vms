import { NextResponse } from "next/server";
import { z } from "zod";
import { getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";
import { logInfo, logError } from "@/app/api/_lib/logger";
import { extractUpstreamMessage } from "@/app/api/_lib/responses";
import {
  FAST_CHANNEL_CONFIG_FIELDS,
  type FastChannelConfigRow,
} from "@/features/fast-channels/types";

const LOG_NAME = "app.api.fast-channels.[name].config.route";

/** Row shape returned by GET /fast-channel/channel-config/{channelName}. */
type EnigmaFastChannelConfigRow = {
  batchId?: number;
  channelName?: string;
  platform: string;
  device: string;
  source?: string | null;
  cvpId?: string | null;
  format?: string | null;
  midroll?: string | null;
  drm?: string | null;
  encoder?: string | null;
  linear?: string | null;
  token?: string | null;
  scteId3?: string | null;
  subtitle?: string | null;
  multiaudio?: string | null;
  drLecter?: string | null;
  updatedAt?: string;
};

/**
 * Map a backend row to the UI string row used by the config table. `encoder` and `linear`
 * are unused by fast channels; `batchId`, `channelName` and `updatedAt` are not columns —
 * the first two are supplied again on save, resolved from the batch list.
 */
function toUiRow(row: EnigmaFastChannelConfigRow): FastChannelConfigRow {
  return {
    platform:   row.platform,
    device:     row.device,
    source:     row.source     ?? "",
    cvpId:      row.cvpId      ?? "",
    format:     row.format     ?? "",
    midroll:    row.midroll    ?? "",
    drm:        row.drm        ?? "",
    token:      row.token      ?? "",
    scteId3:    row.scteId3    ?? "",
    subtitle:   row.subtitle   ?? "",
    multiaudio: row.multiaudio ?? "",
    drLecter:   row.drLecter   ?? "",
  };
}

/**
 * Build the backend payload for a UI row. `batchId`, `channelName`, `platform` and `device`
 * form the composite key. Every field is sent, with N/A as an explicit null: Enigma leaves
 * omitted fields untouched, so leaving out a cleared field would keep its old value.
 */
function toEnigmaRow(
  row: FastChannelConfigRow,
  batchId: number,
  channelName: string
): Record<string, unknown> {
  const out: Record<string, unknown> = {
    batchId,
    channelName,
    platform: row.platform,
    device: row.device,
  };
  for (const field of FAST_CHANNEL_CONFIG_FIELDS) {
    out[field] = row[field] || null;
  }
  return out;
}

const rowSchema = z.object({
  platform: z.string().min(1),
  device: z.string().min(1),
  source: z.string().nullish(),
  cvpId: z.string().nullish(),
  format: z.string().nullish(),
  midroll: z.string().nullish(),
  drm: z.string().nullish(),
  token: z.string().nullish(),
  scteId3: z.string().nullish(),
  subtitle: z.string().nullish(),
  multiaudio: z.string().nullish(),
  drLecter: z.string().nullish(),
});

const bodySchema = z.object({
  batchId: z.number().int(),
  configs: z.array(rowSchema),
});

function configUrl(name: string): string {
  return `${getEnigmaBaseUrl()}/fast-channel/channel-config/${encodeURIComponent(name)}`;
}

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const url = configUrl(name);

  let response: Response;
  try {
    response = await fetchVMS(url, { method: "GET", cache: "no-store" });
  } catch (error) {
    logError({ name: LOG_NAME, fn: "GET", msg: `Fetch failed url=${url}`, error });
    return NextResponse.json({ message: String(error) }, { status: 500 });
  }

  // A channel with no config yet renders an all-N/A table rather than an error.
  if (response.status === 404) return NextResponse.json([]);

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    logError({ name: LOG_NAME, fn: "GET", msg: `Non-OK response url=${url}`, error: new Error(`HTTP ${response.status}: ${text}`) });
    return NextResponse.json({ message: extractUpstreamMessage(text, response.status) }, { status: response.status });
  }

  const data = (await response.json()) as EnigmaFastChannelConfigRow[];
  const rows = Array.isArray(data) ? data.map(toUiRow) : [];
  logInfo({ name: LOG_NAME, fn: "GET", msg: "Enigma response", data: rows });
  return NextResponse.json(rows);
}

export async function PUT(request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;

  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    logError({ name: LOG_NAME, fn: "PUT", msg: "Invalid request payload", error: parsed.error });
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const { batchId } = parsed.data;
  // Which rows to send is decided by the caller: it drops all-N/A rows that were never
  // persisted, but must keep persisted ones the user cleared so their values get nulled.
  const configs = (parsed.data.configs as FastChannelConfigRow[])
    .map((row) => toEnigmaRow(row, batchId, name));

  const url = configUrl(name);

  let response: Response;
  try {
    response = await fetchVMS(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ configs }),
    });
  } catch (error) {
    logError({ name: LOG_NAME, fn: "PUT", msg: `Fetch failed url=${url}`, error });
    return NextResponse.json({ message: String(error) }, { status: 500 });
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    logError({ name: LOG_NAME, fn: "PUT", msg: `Non-OK response url=${url}`, error: new Error(`HTTP ${response.status}: ${text}`) });
    return NextResponse.json({ message: extractUpstreamMessage(text, response.status) }, { status: response.status });
  }

  const data = await response.json();
  logInfo({ name: LOG_NAME, fn: "PUT", msg: "Enigma response", data });
  return NextResponse.json(data);
}
