import { NextResponse } from "next/server";
import { getFastChannelsUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";
import { logInfo, logError } from "@/app/api/_lib/logger";
import { extractUpstreamMessage } from "@/app/api/_lib/responses";

const LOG_NAME = "app.api.fast-channels.[name].route";

export async function PUT(request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const endpoint = getFastChannelsUrl();
  if (!endpoint) {
    logError({ name: LOG_NAME, fn: "PUT", msg: "FAST_CHANNELS_ENDPOINT is not configured", error: new Error("Missing FAST_CHANNELS_ENDPOINT env var") });
    return NextResponse.json({ error: "FAST_CHANNELS_ENDPOINT is not configured" }, { status: 503 });
  }
  const xmlBody = await request.text();
  const url = `${endpoint}/${encodeURIComponent(name)}`;
  let response: Response;
  try {
    response = await fetchVMS(url, {
      method: "PUT",
      headers: { "Content-Type": "application/xml" },
      body: xmlBody,
    });
  } catch (err) {
    logError({ name: LOG_NAME, fn: "PUT", msg: `Fetch failed url=${url}`, error: err });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
  const responseText = await response.text();
  if (!response.ok) {
    logError({ name: LOG_NAME, fn: "PUT", msg: `Non-OK response url=${url}`, error: new Error(`HTTP ${response.status}: ${responseText}`) });
    return NextResponse.json({ message: extractUpstreamMessage(responseText, response.status) }, { status: response.status });
  }
  logInfo({ name: LOG_NAME, fn: "PUT", msg: "Fast-Channels response", data: { name, responseText } });
  return NextResponse.json({});
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const endpoint = getFastChannelsUrl();
  if (!endpoint) {
    logError({ name: LOG_NAME, fn: "DELETE", msg: "FAST_CHANNELS_ENDPOINT is not configured", error: new Error("Missing FAST_CHANNELS_ENDPOINT env var") });
    return NextResponse.json({ error: "FAST_CHANNELS_ENDPOINT is not configured" }, { status: 503 });
  }
  const url = `${endpoint}/${encodeURIComponent(name)}`;
  let response: Response;
  try {
    response = await fetchVMS(url, { method: "DELETE" });
  } catch (err) {
    logError({ name: LOG_NAME, fn: "DELETE", msg: `Fetch failed url=${url}`, error: err });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
  if (!response.ok) {
    const text = await response.text();
    logError({ name: LOG_NAME, fn: "DELETE", msg: `Non-OK response url=${url}`, error: new Error(`HTTP ${response.status}: ${text}`) });
    return NextResponse.json({ message: extractUpstreamMessage(text, response.status) }, { status: response.status });
  }
  logInfo({ name: LOG_NAME, fn: "DELETE", msg: "Fast-Channels response", data: { name } });
  return NextResponse.json({});
}
