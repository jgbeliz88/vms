import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
import type { Channel, Linear } from "@/features/live/types";
import { getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";

const schema = z.object({
  channelInternalId: z.string().min(1),
  encoderId: z.number(),
  podId: z.number(),
  podName: z.string().min(1),
  linearName: z.string().min(1),
  drm: z.boolean(),
  adsReplacement: z.boolean(),
  fragmentLength: z.string().min(1),
  disableDrmManifests: z.boolean(),
  drmVendor: z.string().optional().default(""),
  contentId: z.string().optional().default(""),
});

function resolveStorePath() {
  return path.join(process.cwd(), "data", "live-channels.json");
}

async function readStore(storePath: string): Promise<Channel[]> {
  try {
    const raw = await fs.readFile(storePath, "utf8");
    return JSON.parse(raw) as Channel[];
  } catch {
    return [];
  }
}

async function writeStore(storePath: string, channels: Channel[]) {
  await fs.writeFile(storePath, JSON.stringify(channels, null, 2));
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  const {
    channelInternalId,
    encoderId,
    podId,
    podName,
    linearName,
    drm,
    adsReplacement,
    fragmentLength,
    disableDrmManifests,
    drmVendor,
    contentId,
  } = parsed.data;

  const enigmaResponse = await fetch(`${getEnigmaBaseUrl()}/live/${podName}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channelId: linearName, drm, adsReplacement, fragmentLength, disableDrmManifests, drmVendor, contentId }),
  });

  if (!enigmaResponse.ok) {
    const text = await enigmaResponse.text();
    return NextResponse.json(
      { message: `Enigma API error (${enigmaResponse.status}): ${text}` },
      { status: enigmaResponse.status }
    );
  }

  const storePath = resolveStorePath();
  const channels = await readStore(storePath);
  const index = channels.findIndex((ch) => ch.id === channelInternalId);
  if (index === -1) {
    return NextResponse.json({ message: "Channel not found" }, { status: 404 });
  }

  const newLinear: Linear = {
    linearName,
    drm,
    adsReplacement,
    fragmentLength,
    disableDrmManifests,
    drmVendor,
    contentId,
  };

  const existingRefIndex = channels[index].linears.findIndex(
    (ref) => ref.encoderId === encoderId && ref.podId === podId
  );

  if (existingRefIndex >= 0) {
    channels[index].linears[existingRefIndex] = { encoderId, podId, linear: newLinear };
  } else {
    channels[index].linears.push({ encoderId, podId, linear: newLinear });
  }

  await writeStore(storePath, channels);
  return NextResponse.json({ ok: true, podName, linear: newLinear }, { status: 201 });
}
