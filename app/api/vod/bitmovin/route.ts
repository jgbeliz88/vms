import { NextResponse } from "next/server";
import { getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";

export async function GET() {
  const endpoint = `${getEnigmaBaseUrl()}/jupiter/list`;
  try {
    const response = await fetch(endpoint, { cache: "no-store" });
    if (!response.ok) {
      return NextResponse.json({ error: "Upstream error" }, { status: response.status });
    }
    return NextResponse.json(await response.json());
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
