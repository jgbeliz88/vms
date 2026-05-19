import { NextResponse } from "next/server";
import { getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";
import { logInfo, logError } from "@/app/api/_lib/logger";
import { extractUpstreamMessage } from "@/app/api/_lib/responses";

const LOG_NAME = "app.api.fast-channels.[name].transitions.route";

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const base = getEnigmaBaseUrl();
  const url = `${base}/virtual-channel/status/${encodeURIComponent(name)}`;
  let response: Response;
  try {
    response = await fetchVMS(url, { cache: "no-store" });
  } catch (err) {
    logError({ name: LOG_NAME, fn: "GET", msg: `Fetch failed url=${url}`, error: err });
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ message: msg }, { status: 500 });
  }
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    logError({ name: LOG_NAME, fn: "GET", msg: `Non-OK response url=${url}`, error: new Error(`HTTP ${response.status}: ${text}`) });
    return NextResponse.json({ message: extractUpstreamMessage(text, response.status) }, { status: response.status });
  }
  const data = await response.json();
  logInfo({ name: LOG_NAME, fn: "GET", msg: "Enigma response", data });
  return NextResponse.json(data);
}
