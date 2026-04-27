import { NextResponse } from "next/server";
import { getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";

export async function GET(request: Request) {
  const enigmaBase = getEnigmaBaseUrl();
  const { searchParams } = new URL(request.url);
  const authHeader = request.headers.get("Authorization");

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authHeader) headers["Authorization"] = authHeader;

  // Forward pagination params to upstream
  const upstreamParams = new URLSearchParams();
  const page = searchParams.get("page");
  const pageSize = searchParams.get("pageSize");
  if (page) upstreamParams.set("page", page);
  if (pageSize) upstreamParams.set("pageSize", pageSize);
  const query = upstreamParams.toString();

  try {
    const url = query ? `${enigmaBase}/history?${query}` : `${enigmaBase}/history`;
    const response = await fetchVMS(url, { method: "GET", headers });
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
