import { NextResponse } from "next/server";
import { z } from "zod";
import { getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";

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
  const enigmaResponse = await fetchVMS(`${enigmaBase}/live/${podName}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(enigmaPayload),
  });

  if (!enigmaResponse.ok) {
    const text = await enigmaResponse.text();
    const curlCommand = `curl -X POST "${enigmaBase}/live/${podName}" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(enigmaPayload)}'`;
    return NextResponse.json(
      { message: `Enigma API error (${enigmaResponse.status}): ${text}`, curlCommand },
      { status: enigmaResponse.status }
    );
  }

  return NextResponse.json(await enigmaResponse.json(), { status: 201 });
}
