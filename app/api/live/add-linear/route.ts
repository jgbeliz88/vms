import { NextResponse } from "next/server";
import { z } from "zod";
import { getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";
import { logInfo, logError } from "@/app/api/_lib/logger";
import { extractUpstreamMessage } from "@/app/api/_lib/responses";

const LOG_NAME = "app.api.live.add-linear.route";

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
  pods: z.array(z.object({ name: z.string().min(1), encoders: z.array(z.number().int()) })).min(1),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    logError({ name: LOG_NAME, fn: "POST", msg: "Invalid request payload", error: parsed.error });
    return NextResponse.json({ message: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  const { channelId, name, drm, adsReplacement, fragmentLength, disableDrmManifests, drmVendor, contentId, tags, pods } = parsed.data;

  const enigmaBase = getEnigmaBaseUrl();
  const enigmaPayload = {
    linear: { channelId, name, drm, adsReplacement, fragmentLength, disableDrmManifests, drmVendor, contentId, tags },
    pods,
  };
  const url = `${enigmaBase}/live/linear`;
  let enigmaResponse: Response;
  try {
    enigmaResponse = await fetchVMS(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(enigmaPayload),
    });
  } catch (err) {
    logError({ name: LOG_NAME, fn: "POST", msg: `Fetch failed url=${url}`, error: err });
    const curlCommand = `curl -X POST "${url}" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(enigmaPayload)}'`;
    return NextResponse.json({ message: String(err), curlCommand }, { status: 500 });
  }

  if (!enigmaResponse.ok) {
    const text = await enigmaResponse.text();
    logError({ name: LOG_NAME, fn: "POST", msg: `Non-OK response url=${url}`, error: new Error(`HTTP ${enigmaResponse.status}: ${text}`) });
    const curlCommand = `curl -X POST "${url}" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(enigmaPayload)}'`;
    return NextResponse.json(
      { message: extractUpstreamMessage(text, enigmaResponse.status), curlCommand },
      { status: enigmaResponse.status }
    );
  }

  const data = await enigmaResponse.json();
  logInfo({ name: LOG_NAME, fn: "POST", msg: "Enigma response", data });
  return NextResponse.json(data, { status: 201 });
}
