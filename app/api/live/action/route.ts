import { NextResponse } from "next/server";
import { z } from "zod";
import { getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";
import { logInfo, logError } from "@/app/api/_lib/logger";
import { extractUpstreamMessage } from "@/app/api/_lib/responses";

const LOG_NAME = "app.api.live.action.route";

const requestSchema = z.object({
  actionId: z.enum(["sync", "clean", "delete-flow"]),
  podName: z.string().min(1),
  podNode: z.string().optional(),
  linearName: z.string().optional(),
  action: z.enum(["clear", "delete"]).optional().default("clear"),
});

function buildTarget(
  actionId: string,
  podName: string,
  linearName: string,
  action: "clear" | "delete"
): { url: string; method: string } {
  const enigmaBase = getEnigmaBaseUrl();
  const pod = encodeURIComponent(podName);
  const linear = encodeURIComponent(linearName);
  if (actionId === "sync") {
    return { url: `${enigmaBase}/live/synchronize/${pod}/${linear}`, method: "GET" };
  }
  if (actionId === "clean") {
    return { url: `${enigmaBase}/live/clean/${pod}/${linear}`, method: "GET" };
  }
  return { url: `${enigmaBase}/live/${pod}/${linear}?action=${action}`, method: "DELETE" };
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    logError({ name: LOG_NAME, fn: "POST", msg: "Invalid request payload", error: parsed.error });
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const { actionId, podName, linearName, action } = parsed.data;

  if (actionId === "delete-flow" && !linearName) {
    return NextResponse.json({ message: "linearName is required for delete-flow" }, { status: 400 });
  }

  if ((actionId === "sync" || actionId === "clean") && !linearName) {
    return NextResponse.json({ message: "linearName is required for sync/clean" }, { status: 400 });
  }

  const { url, method } = buildTarget(actionId, podName, linearName!, action);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "*/*",
    "Accept-Encoding": "gzip, deflate, br"
  };
  const authHeader = request.headers.get("Authorization");
  if (authHeader) headers["Authorization"] = authHeader;

  let response: Response;
  try {
    response = await fetchVMS(url, { method, headers });
  } catch (error: unknown) {
    logError({ name: LOG_NAME, fn: "POST", msg: `Fetch failed url=${url}`, error });
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
    logError({ name: LOG_NAME, fn: "POST", msg: `Non-OK response url=${url}`, error: new Error(`HTTP ${response.status}: ${text}`) });
    return NextResponse.json(
      { message: extractUpstreamMessage(text, response.status), data },
      { status: response.status }
    );
  }

  logInfo({ name: LOG_NAME, fn: "POST", msg: "Enigma response", data: { status: response.status, data } });
  return NextResponse.json({ status: response.status, data });
}
