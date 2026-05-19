import { NextResponse } from "next/server";
import type { LightflowVodContent } from "@/features/vod/lightflow-types";
import { getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";
import { logInfo, logError } from "@/app/api/_lib/logger";
import { extractUpstreamMessage } from "@/app/api/_lib/responses";

const LOG_NAME = "app.api.vod.lightflow.route";

export async function GET() {
  const endpoint = `${getEnigmaBaseUrl()}/mercury/list`;
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
  const contents = (await response.json()) as LightflowVodContent[];
  logInfo({ name: LOG_NAME, fn: "GET", msg: "Enigma response", data: contents });
  return NextResponse.json(contents);
}
