import { NextResponse } from "next/server";
import { getFastChannelsUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";
import { logInfo, logError } from "@/app/api/_lib/logger";
import { extractUpstreamMessage } from "@/app/api/_lib/responses";

const LOG_NAME = "app.api.fast-channels.[name].transitions.[transitionName].smil.route";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string; transitionName: string }> }
) {
  const { name, transitionName } = await params;
  const endpoint = getFastChannelsUrl();
  const url = `${endpoint}/${encodeURIComponent(name)}/transitions/${encodeURIComponent(transitionName)}/smil`;
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
    logError({ name: LOG_NAME, fn: "GET", msg: `Non-OK response url=${url}`, error: new Error(`HTTP ${response.status}: ${text}`) });
    return NextResponse.json({ message: extractUpstreamMessage(text, response.status) }, { status: response.status });
  }
  const body = await response.text();
  const contentType = response.headers.get("Content-Type") ?? "application/xml";
  logInfo({ name: LOG_NAME, fn: "GET", msg: "Fast-Channels response", data: { name, transitionName, contentType, size: body.length } });
  return new NextResponse(body, { headers: { "Content-Type": contentType } });
}
