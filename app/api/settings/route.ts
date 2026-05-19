import { NextResponse } from "next/server";
import { z } from "zod";
import { getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";
import { zodError, extractUpstreamMessage } from "@/app/api/_lib/responses";
import { logInfo, logError } from "@/app/api/_lib/logger";

const LOG_NAME = "app.api.settings.route";

const vmsSettingsSchema = z.object({
  streamingFormats: z.object({
    hls: z.string(),
    dash: z.string(),
    smooth: z.string(),
  }),
  drmPaths: z.object({
    clear: z.string(),
    widevine: z.string(),
    fairplay: z.string(),
    playready: z.string(),
  }),
  akamai: z.object({ live: z.string(), vod: z.string(), fast: z.string() }),
  fastly: z.object({ live: z.string(), vod: z.string(), fast: z.string() }),
  origin: z.object({ live: z.string(), vod: z.string(), fast: z.string() }),
});

export async function GET() {
  const url = `${getEnigmaBaseUrl()}/setting-vms/list`;
  let response: Response;
  try {
    response = await fetchVMS(url);
  } catch (err) {
    logError({ name: LOG_NAME, fn: "GET", msg: `Fetch failed url=${url}`, error: err });
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
  if (!response.ok) {
    const text = await response.text();
    logError({ name: LOG_NAME, fn: "GET", msg: `Non-OK response url=${url}`, error: new Error(`HTTP ${response.status}: ${text}`) });
    return NextResponse.json({ message: extractUpstreamMessage(text, response.status) }, { status: response.status });
  }
  const data = await response.json();
  logInfo({ name: LOG_NAME, fn: "GET", msg: "Enigma response", data });
  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const parsed = vmsSettingsSchema.safeParse(body);
  if (!parsed.success) {
    logError({ name: LOG_NAME, fn: "PUT", msg: "Invalid request payload", error: parsed.error });
    return zodError(parsed.error.issues);
  }

  const url = `${getEnigmaBaseUrl()}/setting-vms`;
  let response: Response;
  try {
    response = await fetchVMS(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: parsed.data }),
    });
  } catch (err) {
    logError({ name: LOG_NAME, fn: "PUT", msg: `Fetch failed url=${url}`, error: err });
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }

  if (!response.ok) {
    const text = await response.text();
    logError({ name: LOG_NAME, fn: "PUT", msg: `Non-OK response url=${url}`, error: new Error(`HTTP ${response.status}: ${text}`) });
    return NextResponse.json({ message: extractUpstreamMessage(text, response.status) }, { status: response.status });
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const data = await response.json();
    logInfo({ name: LOG_NAME, fn: "PUT", msg: "Enigma response", data });
    return NextResponse.json(data);
  }
  const text = await response.text();
  logInfo({ name: LOG_NAME, fn: "PUT", msg: "Enigma response", data: { message: text } });
  return NextResponse.json({ message: text });
}
