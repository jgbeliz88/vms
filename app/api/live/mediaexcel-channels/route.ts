import { NextResponse } from "next/server";
import { z } from "zod";
import { getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";
import { logInfo, logError } from "@/app/api/_lib/logger";
import { extractUpstreamMessage } from "@/app/api/_lib/responses";

const LOG_NAME = "app.api.live.mediaexcel-channels.route";

const mediaexcelChannelSchema = z.object({
  id: z.number(),
  deviceId: z.number(),
  encoderName: z.string(),
  name: z.string(),
  channelIndex: z.number(),
  pods: z.array(z.string()),
});

const responseSchema = z.object({
  channels: z.array(mediaexcelChannelSchema),
});

export async function GET() {
  const url = `${getEnigmaBaseUrl()}/mediaexcel/channels`;
  let response: Response;
  try {
    response = await fetchVMS(url);
  } catch (err) {
    logError({ name: LOG_NAME, fn: "GET", msg: `Fetch failed url=${url}`, error: err });
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    logError({ name: LOG_NAME, fn: "GET", msg: `Non-OK response url=${url}`, error: new Error(`HTTP ${response.status}: ${text}`) });
    return NextResponse.json({ message: extractUpstreamMessage(text, response.status) }, { status: response.status });
  }

  const raw = await response.json();
  const parsed = responseSchema.safeParse(raw);
  if (!parsed.success) {
    logError({ name: LOG_NAME, fn: "GET", msg: "Unexpected response shape", error: parsed.error });
    return NextResponse.json({ message: "Unexpected response from Enigma" }, { status: 502 });
  }

  logInfo({ name: LOG_NAME, fn: "GET", msg: "Mediaexcel channels fetched", data: { count: parsed.data.channels.length } });
  return NextResponse.json(parsed.data.channels);
}
