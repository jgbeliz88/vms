import { NextResponse } from "next/server";
import { getFastChannelsUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const endpoint = getFastChannelsUrl();
  try {
    const response = await fetchVMS(`${endpoint}/${encodeURIComponent(name)}/transitions`, {
      cache: "no-store"
    });
    if (!response.ok) return NextResponse.json({});
    return NextResponse.json(await response.json());
  } catch {
    return NextResponse.json({});
  }
}
