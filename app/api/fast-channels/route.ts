import { NextResponse } from "next/server";
import type { FastChannel } from "@/features/fast-channels/types";
import { getFastChannelsUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";
import { logInfo, logError } from "@/app/api/_lib/logger";
import { extractUpstreamMessage } from "@/app/api/_lib/responses";

const LOG_NAME = "app.api.fast-channels.route";

export async function GET() {
  const endpoint = getFastChannelsUrl();
  if (!endpoint) {
    logError({ name: LOG_NAME, fn: "GET", msg: "FAST_CHANNELS_ENDPOINT is not configured", error: new Error("Missing FAST_CHANNELS_ENDPOINT env var") });
    return NextResponse.json({ error: "FAST_CHANNELS_ENDPOINT is not configured" }, { status: 503 });
  }
  let response: Response;
  try {
    response = await fetchVMS(endpoint, { cache: "no-store" });
  } catch (err) {
    logError({ name: LOG_NAME, fn: "GET", msg: `Fetch failed url=${endpoint}`, error: err });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    logError({ name: LOG_NAME, fn: "GET", msg: `Non-OK response url=${endpoint}`, error: new Error(`HTTP ${response.status}${text ? `: ${text}` : ""}`) });
    return NextResponse.json({ message: extractUpstreamMessage(text, response.status) }, { status: response.status });
  }
  const channels = (await response.json()) as FastChannel[];
  logInfo({ name: LOG_NAME, fn: "GET", msg: "Fast-Channels response", data: channels });
  return NextResponse.json(channels);
}
