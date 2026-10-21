import { NextResponse } from "next/server";
import { getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";
import { logInfo, logError } from "@/app/api/_lib/logger";
import { extractUpstreamMessage } from "@/app/api/_lib/responses";

const LOG_NAME = "app.api.live.linears.[podName].route";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ podName: string }> }
) {
  const { podName } = await params;
  const enigmaBase = getEnigmaBaseUrl();
  const url = `${enigmaBase}/live/linears/${podName}`;

  const headers: Record<string, string> = { Accept: "*/*" };
  const authHeader = request.headers.get("Authorization");
  if (authHeader) headers["Authorization"] = authHeader;

  let response: Response;
  try {
    response = await fetchVMS(url, { method: "DELETE", headers });
  } catch (error: unknown) {
    logError({ name: LOG_NAME, fn: "DELETE", msg: `Fetch failed url=${url}`, error });
    const msg = error instanceof Error ? error.message : "Request failed";
    return NextResponse.json({ message: msg }, { status: 500 });
  }

  const text = await response.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!response.ok) {
    logError({ name: LOG_NAME, fn: "DELETE", msg: `Non-OK response url=${url}`, error: new Error(`HTTP ${response.status}: ${text}`) });
    return NextResponse.json(
      { message: extractUpstreamMessage(text, response.status), data },
      { status: response.status }
    );
  }

  logInfo({ name: LOG_NAME, fn: "DELETE", msg: "Enigma response", data: { status: response.status, data } });
  return NextResponse.json({ status: response.status, data });
}
