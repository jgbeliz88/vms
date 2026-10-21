import { type NextRequest, NextResponse } from "next/server";
import { getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";
import { logInfo, logError } from "@/app/api/_lib/logger";
import { extractUpstreamMessage } from "@/app/api/_lib/responses";

const LOG_NAME = "app.api.vod.lightflow.route";

const SCALAR_PARAMS = ["page", "limit", "sortBy", "order", "id", "status", "createdAtOlderThan", "createdAtNewerThan"] as const;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const upstream = new URLSearchParams();

  for (const key of SCALAR_PARAMS) {
    const v = sp.get(key);
    if (v) upstream.set(key, v);
  }
  for (const l of sp.getAll("labels")) upstream.append("labels", l);

  const endpoint = `${getEnigmaBaseUrl()}/mercury/list?${upstream}`;
  let response: Response;
  try {
    response = await fetchVMS(endpoint, { cache: "no-store" });
  } catch (err) {
    logError({ name: LOG_NAME, fn: "GET", msg: `Fetch failed url=${endpoint}`, error: err });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    logError({ name: LOG_NAME, fn: "GET", msg: `Non-OK response url=${endpoint}`, error: new Error(`HTTP ${response.status}${text ? `: ${text}` : ""}`) });
    return NextResponse.json({ message: extractUpstreamMessage(text, response.status) }, { status: response.status });
  }
  const data = await response.json();
  logInfo({ name: LOG_NAME, fn: "GET", msg: "Enigma response", data });
  return NextResponse.json(data);
}
