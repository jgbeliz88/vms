import { NextResponse } from "next/server";
import { z } from "zod";
import { getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";

const configRowSchema = z.object({
  channelId: z.number().optional(),
  platform: z.string(),
  device: z.string(),
  source: z.string().optional(),
  cvpId: z.string().optional(),
  format: z.string().optional(),
  midroll: z.string().optional(),
  drm: z.string().optional(),
  encoder: z.string().optional(),
  pod: z.string().optional(),
  linear: z.string().optional(),
  token: z.string().optional(),
  scteId3: z.string().optional(),
  subtitle: z.string().optional(),
  multiaudio: z.string().optional(),
  drLecter: z.string().optional(),
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
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  // Inject channelId into every row before forwarding to Enigma
  const rows = parsed.data.config.map((row) => ({ ...row, channelId }));

  const enigmaBase = getEnigmaBaseUrl();
  const response = await fetchVMS(`${enigmaBase}/live/channels/${channelId}/config`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ config: rows }),
  });

  if (!response.ok) {
    const text = await response.text();
    return NextResponse.json({ message: `Backend error: ${text}` }, { status: response.status });
  }

  return NextResponse.json(await response.json());
}
