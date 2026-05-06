import { NextResponse } from "next/server";
import { getFastChannelsUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";

export async function PUT(request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const endpoint = getFastChannelsUrl();
  if (!endpoint) {
    return NextResponse.json({ error: "FAST_CHANNELS_ENDPOINT is not configured" }, { status: 503 });
  }
  const xmlBody = await request.text();
  const response = await fetchVMS(`${endpoint}/${encodeURIComponent(name)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/xml" },
    body: xmlBody,
  });
  const responseText = await response.text();
  if (!response.ok) {
    return NextResponse.json({ error: `Upstream error: ${responseText}` }, { status: response.status });
  }
  return NextResponse.json({});
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const endpoint = getFastChannelsUrl();
  if (!endpoint) {
    return NextResponse.json({ error: "FAST_CHANNELS_ENDPOINT is not configured" }, { status: 503 });
  }
  const response = await fetchVMS(`${endpoint}/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const text = await response.text();
    return NextResponse.json({ error: `Upstream error: ${text}` }, { status: response.status });
  }
  return NextResponse.json({});
}
