import { NextResponse } from "next/server";
import type { FastChannel } from "@/features/fast-channels/types";
import { getFastChannelsUrl } from "@/app/api/_lib/env-urls";

export async function GET() {
  const endpoint = getFastChannelsUrl();
  if (!endpoint) {
    return NextResponse.json({ error: "FAST_CHANNELS_ENDPOINT is not configured" }, { status: 503 });
  }
  try {
    const response = await fetch(endpoint, { cache: "no-store" });
    if (!response.ok) {
      return NextResponse.json({ error: "Upstream error" }, { status: response.status });
    }
    const channels = (await response.json()) as FastChannel[];
    return NextResponse.json(channels);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

