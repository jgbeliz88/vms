import { NextResponse } from "next/server";
import { getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";
import { logInfo, logError } from "@/app/api/_lib/logger";
import { extractUpstreamMessage } from "@/app/api/_lib/responses";

const LOG_NAME = "app.api.live.linear.[linearId].disable.route";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ linearId: string }> }
) {
  const { linearId } = await params;
  const enigmaBase = getEnigmaBaseUrl();
  const url = `${enigmaBase}/live/linear/disable/${linearId}`;

  let response: Response;
  try {
    response = await fetchVMS(url, { method: "GET" });
  } catch (err) {
    logError({ name: LOG_NAME, fn: "GET", msg: `Fetch failed url=${url}`, error: err });
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }

  const text = await response.text();
  let data: unknown;
  try { data = JSON.parse(text); } catch { data = text; }

  if (!response.ok) {
    logError({ name: LOG_NAME, fn: "GET", msg: `Non-OK response url=${url}`, error: new Error(`HTTP ${response.status}: ${text}`) });
    return NextResponse.json({ message: extractUpstreamMessage(text, response.status), data }, { status: response.status });
  }

  logInfo({ name: LOG_NAME, fn: "GET", msg: "Enigma response", data: { status: response.status, data } });
  return NextResponse.json(data);
}
