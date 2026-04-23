import { NextResponse } from "next/server";
import { getFastChannelsUrl } from "@/app/api/_lib/env-urls";

export async function GET() {
  const endpoint = getFastChannelsUrl();
  try {
    const response = await fetch(`${endpoint}/transitions`, { cache: "no-store" });
    if (!response.ok) return NextResponse.json({});
    return NextResponse.json(await response.json());
  } catch {
    return NextResponse.json({});
  }
}

export async function POST(request: Request) {
  const endpoint = getFastChannelsUrl();
  try {
    const body = await request.json();
    const response = await fetch(`${endpoint}/transitions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store"
    });
    if (!response.ok) {
      return NextResponse.json({ message: "Failed to create transition" }, { status: response.status });
    }
    return NextResponse.json(await response.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
