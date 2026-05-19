import { NextResponse } from "next/server";
import { getEnigmaBaseUrl, getFastChannelsUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";
import { logInfo, logError } from "@/app/api/_lib/logger";
import { extractUpstreamMessage } from "@/app/api/_lib/responses";

const LOG_NAME = "app.api.fast-channels.[name].transitions.[transitionName].route";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ name: string; transitionName: string }> }
) {
  const { name, transitionName } = await params;
  const endpoint = getFastChannelsUrl();
  const url = `${endpoint}/${encodeURIComponent(name)}/transitions/${encodeURIComponent(transitionName)}`;
  let response: Response;
  try {
    response = await fetchVMS(url, { method: "DELETE", cache: "no-store" });
  } catch (error) {
    logError({ name: LOG_NAME, fn: "DELETE", msg: `Fetch failed url=${url}`, error });
    const message = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ message }, { status: 500 });
  }
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    logError({ name: LOG_NAME, fn: "DELETE", msg: `Non-OK response url=${url}`, error: new Error(`HTTP ${response.status}${text ? `: ${text}` : ""}`) });
    return NextResponse.json({ message: extractUpstreamMessage(text, response.status) }, { status: response.status });
  }
  logInfo({ name: LOG_NAME, fn: "DELETE", msg: "Fast-Channels response", data: { name, transitionName } });
  return NextResponse.json({});
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ name: string; transitionName: string }> }
) {
  const { name, transitionName } = await params;
  const base = getEnigmaBaseUrl();
  const xml = await request.text();

  const url = `${base}/virtual-channel/channels/${encodeURIComponent(name)}/transitions/${encodeURIComponent(transitionName)}`;
  let response: Response;
  try {
    response = await fetchVMS(url, {
      method: "POST",
      headers: { "Content-Type": "application/xml" },
      body: xml,
      cache: "no-store"
    });
  } catch (error) {
    logError({ name: LOG_NAME, fn: "POST", msg: `Fetch failed url=${url}`, error });
    const message = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ message }, { status: 500 });
  }
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const message = errorBody?.msg ?? "Failed to create transition";
    logError({ name: LOG_NAME, fn: "POST", msg: `Non-OK response url=${url}`, error: new Error(`HTTP ${response.status}: ${message}`) });
    return NextResponse.json({ message }, { status: response.status });
  }
  const data = await response.json();
  logInfo({ name: LOG_NAME, fn: "POST", msg: "Enigma response", data });
  return NextResponse.json(data, { status: 201 });
}
