import { NextResponse } from "next/server";
import { getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";
import { logInfo, logError } from "@/app/api/_lib/logger";

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
    return NextResponse.json({});
  }
  if (!response.ok) {
    logError({ name: LOG_NAME, fn: "GET", msg: `Non-OK response url=${url}`, error: new Error(`HTTP ${response.status}`) });
    return NextResponse.json({});
  }
  const data = await response.json();
  logInfo({ name: LOG_NAME, fn: "GET", msg: "Enigma response", data });
  return NextResponse.json(data);
}
