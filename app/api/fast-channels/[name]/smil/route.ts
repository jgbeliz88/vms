import { NextResponse } from "next/server";
import { getFastChannelsUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const endpoint = getFastChannelsUrl();
  try {
    const response = await fetchVMS(`${endpoint}/${encodeURIComponent(name)}/smil`, {
      cache: "no-store"
    });
    if (!response.ok) {
      return NextResponse.json({ message: "Failed to fetch SMIL" }, { status: response.status });
    }
    const body = await response.text();
    const contentType = response.headers.get("Content-Type") ?? "application/xml";
    return new NextResponse(body, { headers: { "Content-Type": contentType } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
