import { NextResponse } from "next/server";
import { getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";
import { logInfo, logError } from "@/app/api/_lib/logger";
import { extractUpstreamMessage } from "@/app/api/_lib/responses";

const LOG_NAME = "app.api.fast-channels.[name].recreate.route";

// Exposed as POST because recreating is destructive; upstream Enigma serves it as a GET.
export async function POST(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const base = getEnigmaBaseUrl();
  const url = `${base}/fast-channel/channel/recreate/${encodeURIComponent(name)}`;
  let response: Response;
  try {
    response = await fetchVMS(url, { cache: "no-store" });
  } catch (error) {
    logError({ name: LOG_NAME, fn: "POST", msg: `Fetch failed url=${url}`, error });
    const message = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ message }, { status: 500 });
  }
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    logError({ name: LOG_NAME, fn: "POST", msg: `Non-OK response url=${url}`, error: new Error(`HTTP ${response.status}${text ? `: ${text}` : ""}`) });
    return NextResponse.json({ message: extractUpstreamMessage(text, response.status) }, { status: response.status });
  }
  const data = await response.json().catch(() => ({}));
  logInfo({ name: LOG_NAME, fn: "POST", msg: "Enigma response", data: { name } });
  return NextResponse.json(data);
}
