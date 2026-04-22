import { NextResponse } from "next/server";
import { z } from "zod";
import { mockChannels } from "@/features/live/mock";
import type { Channel, Encoder, ResolvedChannel, ResolvedPod } from "@/features/live/types";
import { resolveDataPath, readJsonFile, writeJsonFile } from "@/app/api/_lib/store";
import { zodError } from "@/app/api/_lib/responses";
import { getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";

const createSchema = z.object({
  name: z.string().min(2),
  channelPath: z.string().min(1),
  metadata: z.record(z.unknown()).optional()
});

const configRowSchema = z.object({
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

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).optional(),
  channelPath: z.string().min(1).optional(),
  platform: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  config: z.array(configRowSchema).optional(),
});

const deleteSchema = z.object({
  id: z.string().min(1)
});

function joinChannels(channels: Channel[], encoders: Encoder[]): ResolvedChannel[] {
  const encoderMap = new Map(encoders.map((e) => [e.id, e]));

  return channels.map((ch) => {
    const pods: ResolvedPod[] = (ch.linears ?? []).flatMap((ref) => {
      const encoder = encoderMap.get(ref.encoderId);
      if (!encoder) return [];
      const pod = encoder.pods.find((p) => p.id === ref.podId);
      if (!pod) return [];
      return [
        {
          ...pod,
          encoderName: encoder.encoderChannel,
          linear: ref.linear,
        },
      ];
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { linears: _linears, ...rest } = ch;
    return { ...rest, pods };
  });
}

export async function GET() {
  const storePath = resolveDataPath("live-channels");
  const [channels, encoders] = await Promise.all([
    readJsonFile(storePath, mockChannels),
    fetch(`${getEnigmaBaseUrl()}/live/encoders`)
      .then((r) => (r.ok ? (r.json() as Promise<Encoder[]>) : Promise.resolve([] as Encoder[])))
      .catch(() => [] as Encoder[]),
  ]);
  const resolved = joinChannels(channels, encoders);
  return NextResponse.json(resolved);
}

export async function POST(request: Request) {
  const storePath = resolveDataPath("live-channels");
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return zodError(parsed.error.issues);
  }

  const channels = await readJsonFile(storePath, mockChannels);
  const now = new Date().toISOString();
  const maxNum = channels.reduce((max, ch) => {
    const n = parseInt(ch.id.replace(/^ch-/, ""), 10);
    return isNaN(n) ? max : Math.max(max, n);
  }, 0);
  const next: Channel = {
    id: `ch-${String(maxNum + 1).padStart(3, "0")}`,
    name: parsed.data.name,
    channelPath: parsed.data.channelPath,
    platform: "HLS",
    status: "ok",
    cacheState: "warm",
    lastSync: now,
    linears: [],
    metadata: parsed.data.metadata ?? {}
  };

  const updated = [next, ...channels];
  await writeJsonFile(storePath, updated);
  return NextResponse.json({ ...next, pods: [] }, { status: 201 });
}

export async function PUT(request: Request) {
  const storePath = resolveDataPath("live-channels");
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return zodError(parsed.error.issues);
  }

  const channels = await readJsonFile(storePath, mockChannels);
  const index = channels.findIndex((channel) => channel.id === parsed.data.id);
  if (index === -1) {
    return NextResponse.json({ message: "Channel not found" }, { status: 404 });
  }

  const current = channels[index];
  const updated: Channel = {
    ...current,
    name: parsed.data.name ?? current.name,
    channelPath: parsed.data.channelPath ?? current.channelPath,
    platform: parsed.data.platform ?? current.platform,
    metadata: parsed.data.metadata ?? current.metadata,
    ...(parsed.data.config !== undefined ? { config: parsed.data.config } : {}),
  };

  channels[index] = updated;
  await writeJsonFile(storePath, channels);
  return NextResponse.json(updated);
}

export async function DELETE(request: Request) {
  const storePath = resolveDataPath("live-channels");
  const body = await request.json();
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const channels = await readJsonFile(storePath, mockChannels);
  const filtered = channels.filter((channel) => channel.id !== parsed.data.id);
  await writeJsonFile(storePath, filtered);
  return NextResponse.json({ ok: true });
}
