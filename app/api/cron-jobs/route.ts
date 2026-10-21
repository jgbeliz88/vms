import { NextResponse } from "next/server";
import { getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";
import { logInfo, logError } from "@/app/api/_lib/logger";
import { extractUpstreamMessage } from "@/app/api/_lib/responses";

const LOG_NAME = "app.api.cron-jobs.route";

const TRANSITION_TYPE = "VC_TRANSITION_PUT";

export async function GET() {
  const base = getEnigmaBaseUrl();
  // includeBody=false keeps SMIL payloads out of the response; type narrows it to the
  // transition jobs the Queued Transitions table can actually act on.
  const url = `${base}/cron-jobs?includeBody=false&type=${TRANSITION_TYPE}`;
  let response: Response;
  try {
    response = await fetchVMS(url, { cache: "no-store" });
  } catch (error) {
    logError({ name: LOG_NAME, fn: "GET", msg: `Fetch failed url=${url}`, error });
    const message = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ message }, { status: 500 });
  }
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    logError({ name: LOG_NAME, fn: "GET", msg: `Non-OK response url=${url}`, error: new Error(`HTTP ${response.status}${text ? `: ${text}` : ""}`) });
    return NextResponse.json({ message: extractUpstreamMessage(text, response.status) }, { status: response.status });
  }
  const data = await response.json();
  logInfo({ name: LOG_NAME, fn: "GET", msg: "Enigma response", data: { count: Array.isArray(data) ? data.length : 0 } });
  return NextResponse.json(data);
}
