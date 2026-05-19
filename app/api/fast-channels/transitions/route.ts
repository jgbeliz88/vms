import { NextResponse } from "next/server";
import { getFastChannelsUrl, getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";
import { logInfo, logError } from "@/app/api/_lib/logger";
import { extractUpstreamMessage } from "@/app/api/_lib/responses";

const LOG_NAME = "app.api.fast-channels.transitions.route";

export async function GET() {
  const endpoint = getFastChannelsUrl();
  const url = `${endpoint}/transitions`;
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
  logInfo({ name: LOG_NAME, fn: "GET", msg: "Fast-Channels response", data });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const base = getEnigmaBaseUrl();
  const url = `${base}/fast-channel/scheduleWithoutDelay`;
  let response: Response;
  try {
    const body = await request.json();
    response = await fetchVMS(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store"
    });
  } catch (error) {
    logError({ name: LOG_NAME, fn: "POST", msg: `Fetch failed url=${url}`, error });
    const message = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ message }, { status: 500 });
  }
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const message = errorBody?.msg ?? "Failed to schedule transition";
    logError({ name: LOG_NAME, fn: "POST", msg: `Non-OK response url=${url}`, error: new Error(`HTTP ${response.status}: ${message}`) });
    return NextResponse.json({ message }, { status: response.status });
  }
  const data = await response.json();
  logInfo({ name: LOG_NAME, fn: "POST", msg: "Enigma response", data });
  return NextResponse.json(data, { status: 201 });
}
