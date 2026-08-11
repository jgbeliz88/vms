import { NextResponse } from "next/server";
import { getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";
import { logInfo, logError } from "@/app/api/_lib/logger";
import { extractUpstreamMessage } from "@/app/api/_lib/responses";

const LOG_NAME = "app.api.cron-jobs.[id].route";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const base = getEnigmaBaseUrl();
  const url = `${base}/cron-jobs/${encodeURIComponent(id)}`;
  let response: Response;
  try {
    response = await fetchVMS(url, { method: "DELETE", cache: "no-store" });
  } catch (error) {
    logError({ name: LOG_NAME, fn: "DELETE", msg: `Fetch failed url=${url}`, error });
    const message = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ message }, { status: 500 });
  }
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    logError({ name: LOG_NAME, fn: "DELETE", msg: `Non-OK response url=${url}`, error: new Error(`HTTP ${response.status}${text ? `: ${text}` : ""}`) });
    return NextResponse.json({ message: extractUpstreamMessage(text, response.status) }, { status: response.status });
  }
  const body = await response.json().catch(() => null);
  logInfo({ name: LOG_NAME, fn: "DELETE", msg: "Enigma response", data: { id } });
  return NextResponse.json({ message: body?.msg ?? `Cron Job ${id} deleted successfully` });
}
