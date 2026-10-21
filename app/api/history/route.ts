import { NextResponse } from "next/server";
import { getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";
import { logInfo, logError } from "@/app/api/_lib/logger";
import { extractUpstreamMessage } from "@/app/api/_lib/responses";

const LOG_NAME = "app.api.history.route";

export async function GET(request: Request) {
  const enigmaBase = getEnigmaBaseUrl();
  const { searchParams } = new URL(request.url);
  const authHeader = request.headers.get("Authorization");

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authHeader) headers["Authorization"] = authHeader;

  const upstreamParams = new URLSearchParams();
  const page = searchParams.get("page");
  const pageSize = searchParams.get("pageSize");
  if (page) upstreamParams.set("page", page);
  if (pageSize) upstreamParams.set("pageSize", pageSize);
  const query = upstreamParams.toString();

  const url = query ? `${enigmaBase}/history?${query}` : `${enigmaBase}/history`;
  let response: Response;
  try {
    response = await fetchVMS(url, { method: "GET", headers });
  } catch (error: unknown) {
    logError({ name: LOG_NAME, fn: "GET", msg: `Fetch failed url=${url}`, error });
    const msg = error instanceof Error ? error.message : "Request failed";
    return NextResponse.json({ message: msg }, { status: 500 });
  }

  const text = await response.text();
  let data: unknown;
  try { data = JSON.parse(text); } catch { data = text; }

  if (!response.ok) {
    logError({ name: LOG_NAME, fn: "GET", msg: `Non-OK response url=${url}`, error: new Error(`HTTP ${response.status}: ${text}`) });
    return NextResponse.json({ message: extractUpstreamMessage(text, response.status), data }, { status: response.status });
  }
  logInfo({ name: LOG_NAME, fn: "GET", msg: "Enigma response", data });
  return NextResponse.json(data);
}
