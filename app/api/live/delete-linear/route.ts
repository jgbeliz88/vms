import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
import type { Channel } from "@/features/live/types";

const schema = z.object({
  channelInternalId: z.string().min(1),
  pods: z.array(
    z.object({
      encoderId: z.number(),
      podId: z.number(),
      removeRef: z.boolean().optional().default(false),
    })
  ).min(1),
});

function resolveStorePath() {
  return path.join(process.cwd(), "data", "live-channels.json");
}

async function readStore(storePath: string): Promise<Channel[]> {
  const raw = await fs.readFile(storePath, "utf8");
  return JSON.parse(raw) as Channel[];
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

  const { channelInternalId, pods: podDeletions } = parsed.data;
  const storePath = resolveStorePath();
  const channels = await readStore(storePath);
  const index = channels.findIndex((ch) => ch.id === channelInternalId);
  if (index === -1) {
    return NextResponse.json({ message: "Channel not found" }, { status: 404 });
  }

  const linears = [...channels[index].linears];

  for (const deletion of podDeletions) {
    const refIdx = linears.findIndex(
      (ref) => ref.encoderId === deletion.encoderId && ref.podId === deletion.podId
    );
    if (refIdx >= 0) {
      if (deletion.removeRef) {
        linears.splice(refIdx, 1);
      } else {
        linears[refIdx] = { ...linears[refIdx], linear: null };
      }
    }
  }

  channels[index] = { ...channels[index], linears };
  await writeStore(storePath, channels);
  return NextResponse.json({ ok: true });
}
