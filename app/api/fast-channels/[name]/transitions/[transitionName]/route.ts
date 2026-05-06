import { NextResponse } from "next/server";
import { getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ name: string; transitionName: string }> }
) {
  const { name, transitionName } = await params;
  const base = getEnigmaBaseUrl();
  const xml = await request.text();

  try {
    const upstream = `${base}/virtual-channel/channels/${encodeURIComponent(name)}/transitions/${encodeURIComponent(transitionName)}`;
    const response = await fetchVMS(upstream, {
      method: "POST",
      headers: { "Content-Type": "application/xml" },
      body: xml,
      cache: "no-store"
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      const message = errorBody?.msg ?? "Failed to create transition";
      return NextResponse.json({ message }, { status: response.status });
    }
    return NextResponse.json(await response.json(), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
