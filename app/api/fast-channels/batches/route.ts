import { NextResponse } from "next/server";
import { getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";
import { logInfo, logError } from "@/app/api/_lib/logger";
import { extractUpstreamMessage } from "@/app/api/_lib/responses";
import type { FastChannelBatch } from "@/features/fast-channels/types";

const LOG_NAME = "app.api.fast-channels.batches.route";

/** Enigma wraps the batch list in a status envelope; the UI only wants the array. */
type EnigmaBatchesResponse = { status?: number; data?: FastChannelBatch[] };

export async function GET() {
  const url = `${getEnigmaBaseUrl()}/fast-channel/batch`;

  let response: Response;
  try {
    response = await fetchVMS(url, { method: "GET", cache: "no-store" });
  } catch (error) {
    logError({ name: LOG_NAME, fn: "GET", msg: `Fetch failed url=${url}`, error });
    return NextResponse.json({ message: String(error) }, { status: 500 });
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    logError({ name: LOG_NAME, fn: "GET", msg: `Non-OK response url=${url}`, error: new Error(`HTTP ${response.status}: ${text}`) });
    return NextResponse.json({ message: extractUpstreamMessage(text, response.status) }, { status: response.status });
  }

  const body = (await response.json()) as EnigmaBatchesResponse;
  const batches = Array.isArray(body?.data) ? body.data : [];
  logInfo({ name: LOG_NAME, fn: "GET", msg: "Enigma response", data: batches });
  return NextResponse.json(batches);
}
