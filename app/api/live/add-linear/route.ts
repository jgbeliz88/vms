import { NextResponse } from "next/server";
import { z } from "zod";
import { getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";
import { logInfo, logError } from "@/app/api/_lib/logger";

const LOG_NAME = "app.api.live.add-linear.route";

const schema = z.object({
  channelEntityId: z.number().int().positive(),
  podName: z.string().min(1),
  linearName: z.string().min(1),
  drm: z.boolean(),
  adsReplacement: z.boolean(),
  fragmentLength: z.string().min(1),
  disableDrmManifests: z.boolean(),
  drmVendor: z.string().optional().default(""),
  contentId: z.string().optional().default(""),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    logError({ name: LOG_NAME, fn: "POST", msg: "Invalid request payload", error: parsed.error });
    return NextResponse.json({ message: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  const {
    channelEntityId,
    podName,
    linearName,
    drm,
    adsReplacement,
    fragmentLength,
    disableDrmManifests,
    drmVendor,
    contentId,
  } = parsed.data;

  const enigmaBase = getEnigmaBaseUrl();
  const enigmaPayload = {
    channelId: linearName,
    drm,
    adsReplacement,
    fragmentLength,
    disableDrmManifests,
    drmVendor,
    contentId,
    channelEntityId,
  };
  const url = `${enigmaBase}/live/${podName}`;
  let enigmaResponse: Response;
  try {
    enigmaResponse = await fetchVMS(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(enigmaPayload),
    });
  } catch (err) {
    logError({ name: LOG_NAME, fn: "POST", msg: `Fetch failed url=${url}`, error: err });
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }

  if (!enigmaResponse.ok) {
    const text = await enigmaResponse.text();
    logError({ name: LOG_NAME, fn: "POST", msg: `Non-OK response url=${url}`, error: new Error(`HTTP ${enigmaResponse.status}: ${text}`) });
    const curlCommand = `curl -X POST "${enigmaBase}/live/${podName}" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(enigmaPayload)}'`;
    return NextResponse.json(
      { message: `Enigma API error (${enigmaResponse.status}): ${text}`, curlCommand },
      { status: enigmaResponse.status }
    );
  }

  const data = await enigmaResponse.json();
  logInfo({ name: LOG_NAME, fn: "POST", msg: "Enigma response", data });
  return NextResponse.json(data, { status: 201 });
}
