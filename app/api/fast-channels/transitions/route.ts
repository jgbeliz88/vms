import { NextResponse } from "next/server";
import { getFastChannelsUrl, getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";

export async function GET() {
  const endpoint = getFastChannelsUrl();
  try {
    const response = await fetchVMS(`${endpoint}/transitions`, { cache: "no-store" });
    if (!response.ok) return NextResponse.json({});
    return NextResponse.json(await response.json());
  } catch {
    return NextResponse.json({});
  }
}

export async function POST(request: Request) {
  const base = getEnigmaBaseUrl();
  try {
    const body = await request.json();
    const response = await fetchVMS(`${base}/fast-channel/scheduleWithoutDelay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store"
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      const message = errorBody?.msg ?? "Failed to schedule transition";
      return NextResponse.json({ message }, { status: response.status });
    }
    return NextResponse.json(await response.json(), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
