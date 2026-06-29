import { NextResponse } from "next/server";
import { z } from "zod";
import { getEnigmaBaseUrl, getAkamaiLiveKey, getAkamaiVodKey } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";
import { logInfo, logError } from "@/app/api/_lib/logger";

const LOG_NAME = "app.api.cdn.token.akamai.route";

const requestSchema = z.object({
  acl: z.string().min(1),
  contentType: z.enum(["live", "vod"]),
  window: z.number().int().positive().optional(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    logError({ name: LOG_NAME, fn: "POST", msg: "Invalid request payload", error: parsed.error });
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const { acl, contentType, window } = parsed.data;
  const key = contentType === "vod" ? getAkamaiVodKey() : getAkamaiLiveKey();

  const url = `${getEnigmaBaseUrl()}/cdn/token/akamai`;
  let response: Response;
  try {
    response = await fetchVMS(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acl, key, window: window ?? 7200 }),
    });
  } catch (error: unknown) {
    logError({ name: LOG_NAME, fn: "POST", msg: `Fetch failed url=${url}`, error });
    const msg = error instanceof Error ? error.message : "Request failed";
    return NextResponse.json({ message: msg }, { status: 500 });
  }

  const text = await response.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!response.ok) {
    logError({ name: LOG_NAME, fn: "POST", msg: `Non-OK response url=${url}`, error: new Error(`HTTP ${response.status}: ${text}`) });
    const errMsg =
      data && typeof data === "object" && "msg" in data
        ? String((data as Record<string, unknown>).msg)
        : `Backend returned ${response.status}`;
    return NextResponse.json({ message: errMsg }, { status: response.status });
  }

  logInfo({ name: LOG_NAME, fn: "POST", msg: "CDN token issued", data: { acl, contentType } });
  return NextResponse.json(data, { status: 201 });
}
