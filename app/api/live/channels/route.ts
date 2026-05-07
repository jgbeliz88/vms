import { NextResponse } from "next/server";
import { z } from "zod";
import type { Encoder, ResolvedChannel, ResolvedPod, ChannelStatus, ChannelConfigRow, Linear } from "@/features/live/types";
import { zodError, extractUpstreamMessage } from "@/app/api/_lib/responses";
import { getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";
import { logInfo, logError } from "@/app/api/_lib/logger";

const LOG_NAME = "app.api.live.channels.route";

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
  const channelsUrl = `${enigmaBase}/live/channels`;
  const encodersUrl = `${enigmaBase}/live/encoders`;

  let channelsRes: Response;
  let encodersRes: Response | null;
  try {
    [channelsRes, encodersRes] = await Promise.all([
      fetchVMS(channelsUrl),
      fetchVMS(encodersUrl).catch(() => null),
    ]);
  } catch (err) {
    logError({ name: LOG_NAME, fn: "GET", msg: `Fetch failed url=${channelsUrl}`, error: err });
    return NextResponse.json({ message: "Failed to fetch channels" }, { status: 500 });
  }

  if (!channelsRes.ok) {
    const text = await channelsRes.text().catch(() => "");
    logError({ name: LOG_NAME, fn: "GET", msg: `Non-OK response url=${channelsUrl}`, error: new Error(`HTTP ${channelsRes.status}: ${text}`) });
    return NextResponse.json({ message: extractUpstreamMessage(text, channelsRes.status) }, { status: channelsRes.status });
  }

  const channels: EnigmaChannel[] = await channelsRes.json();
  const encoders: Encoder[] = encodersRes?.ok ? await encodersRes.json() : [];
  const result = joinChannels(channels, encoders);
  logInfo({ name: LOG_NAME, fn: "GET", msg: "Enigma response", data: result });
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    logError({ name: LOG_NAME, fn: "POST", msg: "Invalid request payload", error: parsed.error });
    return zodError(parsed.error.issues);
  }

  const enigmaBase = getEnigmaBaseUrl();
  const url = `${enigmaBase}/live/channels`;
  let response: Response;
  try {
    response = await fetchVMS(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
  } catch (err) {
    logError({ name: LOG_NAME, fn: "POST", msg: `Fetch failed url=${url}`, error: err });
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }

  if (!response.ok) {
    const text = await response.text();
    logError({ name: LOG_NAME, fn: "POST", msg: `Non-OK response url=${url}`, error: new Error(`HTTP ${response.status}: ${text}`) });
    return NextResponse.json({ message: extractUpstreamMessage(text, response.status) }, { status: response.status });
  }

  const data = await response.json();
  logInfo({ name: LOG_NAME, fn: "POST", msg: "Enigma response", data });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(request: Request) {
  const body = await request.json();
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    logError({ name: LOG_NAME, fn: "DELETE", msg: "Invalid request payload", error: parsed.error });
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const enigmaBase = getEnigmaBaseUrl();
  const url = `${enigmaBase}/live/channels/${parsed.data.id}`;
  let response: Response;
  try {
    response = await fetchVMS(url, { method: "DELETE" });
  } catch (err) {
    logError({ name: LOG_NAME, fn: "DELETE", msg: `Fetch failed url=${url}`, error: err });
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }

  if (!response.ok) {
    const text = await response.text();
    logError({ name: LOG_NAME, fn: "DELETE", msg: `Non-OK response url=${url}`, error: new Error(`HTTP ${response.status}: ${text}`) });
    return NextResponse.json({ message: extractUpstreamMessage(text, response.status) }, { status: response.status });
  }

  logInfo({ name: LOG_NAME, fn: "DELETE", msg: "Enigma response", data: { id: parsed.data.id } });
  return NextResponse.json({});
}
