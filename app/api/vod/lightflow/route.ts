import { NextResponse } from "next/server";
import type { LightflowVodContent } from "@/features/vod/lightflow-types";
import { getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";

export async function GET() {
  const endpoint = `${getEnigmaBaseUrl()}/mercury/list`;
  try {
    const response = await fetch(endpoint, { cache: "no-store" });
    if (!response.ok) {
      return NextResponse.json({ error: "Upstream error" }, { status: response.status });
    }
    const contents = (await response.json()) as LightflowVodContent[];
    return NextResponse.json(contents);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
