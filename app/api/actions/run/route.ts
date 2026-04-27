import { NextResponse } from "next/server";
import { getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";

export async function POST(request: Request) {
  const enigmaBase = getEnigmaBaseUrl();
  const authHeader = request.headers.get("Authorization");

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authHeader) headers["Authorization"] = authHeader;

  try {
    const body = await request.text();
    const response = await fetchVMS(`${enigmaBase}/action/run`, {
      method: "POST",
      headers,
      body,
    });
    const text = await response.text();
    let data: unknown;
    try { data = JSON.parse(text); } catch { data = text; }

    if (!response.ok) {
      return NextResponse.json({ message: `Upstream returned ${response.status}`, data }, { status: response.status });
    }
    return NextResponse.json(data);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Request failed";
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
