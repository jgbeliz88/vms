import { NextResponse } from "next/server";
import { z } from "zod";
import { getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";
import { zodError } from "@/app/api/_lib/responses";

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
  const response = await fetchVMS(`${getEnigmaBaseUrl()}/setting-vms/list`);
  if (!response.ok) {
    const text = await response.text();
    return NextResponse.json({ message: `Backend error: ${text}` }, { status: response.status });
  }
  return NextResponse.json(await response.json());
}

export async function PUT(request: Request) {
  const body = await request.json();
  const parsed = vmsSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return zodError(parsed.error.issues);
  }

  const response = await fetchVMS(`${getEnigmaBaseUrl()}/setting-vms`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: parsed.data }),
  });

  if (!response.ok) {
    const text = await response.text();
    return NextResponse.json({ message: `Backend error: ${text}` }, { status: response.status });
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return NextResponse.json(await response.json());
  }
  const text = await response.text();
  return NextResponse.json({ message: text });
}
