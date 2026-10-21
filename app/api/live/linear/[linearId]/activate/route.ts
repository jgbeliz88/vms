import { NextResponse } from "next/server";
import { z } from "zod";
import { getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";
import { logInfo, logError } from "@/app/api/_lib/logger";
import { extractUpstreamMessage } from "@/app/api/_lib/responses";

const LOG_NAME = "app.api.live.linear.[linearId].activate.route";

const schema = z.object({
  channelId: z.number().int().positive(),
  name: z.string().min(1),
  drm: z.boolean(),
  adsReplacement: z.boolean(),
  fragmentLength: z.string().min(1),
  disableDrmManifests: z.boolean(),
  drmVendor: z.string().optional().default(""),
  contentId: z.string().optional().default(""),
  tags: z.array(z.string()),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ linearId: string }> }
) {
  const { linearId } = await params;
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    logError({ name: LOG_NAME, fn: "PATCH", msg: "Invalid request payload", error: parsed.error });
    return NextResponse.json({ message: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  const enigmaBase = getEnigmaBaseUrl();
  const url = `${enigmaBase}/live/linear/activate/${linearId}`;

  let response: Response;
  try {
    response = await fetchVMS(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
  } catch (err) {
    logError({ name: LOG_NAME, fn: "PATCH", msg: `Fetch failed url=${url}`, error: err });
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }

  const text = await response.text();
  let data: unknown;
  try { data = JSON.parse(text); } catch { data = text; }

  if (!response.ok) {
    logError({ name: LOG_NAME, fn: "PATCH", msg: `Non-OK response url=${url}`, error: new Error(`HTTP ${response.status}: ${text}`) });
    return NextResponse.json({ message: extractUpstreamMessage(text, response.status), data }, { status: response.status });
  }

  logInfo({ name: LOG_NAME, fn: "PATCH", msg: "Enigma response", data: { status: response.status, data } });
  return NextResponse.json(data);
}
