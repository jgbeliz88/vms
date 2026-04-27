import { NextResponse } from "next/server";
import { z } from "zod";
import type { Encoder, ResolvedChannel, ResolvedPod, ChannelStatus, ChannelConfigRow, Linear } from "@/features/live/types";
import { zodError } from "@/app/api/_lib/responses";
import { getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";

const createSchema = z.object({
  name: z.string().min(2),
  channelPath: z.string().min(1),
  platform: z.string().optional().default("HLS"),
  metadata: z.record(z.unknown()).optional(),
});

const deleteSchema = z.object({
  id: z.number().int().positive(),
});

type EnigmaChannel = {
  id: number;
  name: string;
  channelPath: string;
  platform: string;
  status: string;
  cacheState: string;
  lastSync: string | null;
  metadata: Record<string, unknown> | null;
  linears: Linear[];
  channelConfigs: ChannelConfigRow[];
};

type PodInfo = { name: string; status: "running" | "stopped" | "degraded"; encoderId: number; encoderName: string };

function joinChannels(channels: EnigmaChannel[], encoders: Encoder[]): ResolvedChannel[] {
  const podMap = new Map<number, PodInfo>();
  for (const encoder of encoders) {
    for (const pod of encoder.pods) {
      podMap.set(pod.id, {
        name: pod.name,
        status: pod.status,
        encoderId: encoder.id,
        encoderName: encoder.encoderChannel,
      });
    }
  }

  return channels.map((ch) => {
    const pods: ResolvedPod[] = ch.linears.flatMap((linear): ResolvedPod[] => {
      const info = podMap.get(linear.podId);
      if (!info) return [];
      return [{ id: linear.podId, name: info.name, status: info.status, encoderId: info.encoderId, encoderName: info.encoderName, linear }];
    });

    return {
      id: ch.id,
      name: ch.name,
      channelPath: ch.channelPath,
      platform: ch.platform,
      status: ch.status as ChannelStatus,
      cacheState: ch.cacheState as "warm" | "cold" | "stale",
      lastSync: ch.lastSync,
      metadata: ch.metadata,
      config: ch.channelConfigs,
      pods,
    };
  });
}

export async function GET() {
  const enigmaBase = getEnigmaBaseUrl();
  const [channelsRes, encodersRes] = await Promise.all([
    fetchVMS(`${enigmaBase}/live/channels`),
    fetchVMS(`${enigmaBase}/live/encoders`).catch(() => null),
  ]);

  if (!channelsRes.ok) {
    return NextResponse.json({ message: "Failed to fetch channels" }, { status: channelsRes.status });
  }

  const channels: EnigmaChannel[] = await channelsRes.json();
  const encoders: Encoder[] = encodersRes?.ok ? await encodersRes.json() : [];
  return NextResponse.json(joinChannels(channels, encoders));
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return zodError(parsed.error.issues);
  }

  const enigmaBase = getEnigmaBaseUrl();
  const response = await fetchVMS(`${enigmaBase}/live/channels`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed.data),
  });

  if (!response.ok) {
    const text = await response.text();
    return NextResponse.json({ message: `Backend error: ${text}` }, { status: response.status });
  }

  return NextResponse.json(await response.json(), { status: 201 });
}

export async function DELETE(request: Request) {
  const body = await request.json();
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const enigmaBase = getEnigmaBaseUrl();
  const response = await fetchVMS(`${enigmaBase}/live/channels/${parsed.data.id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const text = await response.text();
    return NextResponse.json({ message: `Backend error: ${text}` }, { status: response.status });
  }

  return NextResponse.json({});
}
