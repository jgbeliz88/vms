import { NextResponse } from "next/server";
import { z } from "zod";
import { getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";
import { logInfo, logError } from "@/app/api/_lib/logger";
import { extractUpstreamMessage } from "@/app/api/_lib/responses";

const LOG_NAME = "app.api.live.channels.[id].config.route";

const configRowSchema = z.object({
  channelId: z.number().optional(),
  platform: z.string(),
  device: z.string(),
  source: z.string().nullish(),
  cvpId: z.string().nullish(),
  format: z.string().nullish(),
  midroll: z.string().nullish(),
  drm: z.string().nullish(),
  encoder: z.string().nullish(),
  pod: z.string().nullish(),
  linear: z.string().nullish(),
  token: z.string().nullish(),
  scteId3: z.string().nullish(),
  subtitle: z.string().nullish(),
  multiaudio: z.string().nullish(),
  drLecter: z.string().nullish(),
});

const bodySchema = z.object({
  config: z.array(configRowSchema),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const channelId = parseInt(id, 10);
  if (isNaN(channelId)) {
    return NextResponse.json({ message: "Invalid channel id" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    logError({ name: LOG_NAME, fn: "PUT", msg: "Invalid request payload", error: parsed.error });
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  // Inject channelId into every row before forwarding to Enigma
  const rows = parsed.data.config.map((row) => ({ ...row, channelId }));

  const enigmaBase = getEnigmaBaseUrl();
  const url = `${enigmaBase}/live/channel/${channelId}/config`;
  let response: Response;
  try {
    response = await fetchVMS(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config: rows }),
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

  const data = await response.json();
  logInfo({ name: LOG_NAME, fn: "PUT", msg: "Enigma response", data });
  return NextResponse.json(data);
}
