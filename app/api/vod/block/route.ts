import { NextResponse } from "next/server";
import { z } from "zod";
import { getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";
import { logInfo, logError } from "@/app/api/_lib/logger";

const LOG_NAME = "app.api.vod.block.route";

const requestSchema = z.object({
  mam: z.string().min(1),
  uuid: z.string().min(1),
  block: z.boolean(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    logError({ name: LOG_NAME, fn: "POST", msg: "Invalid request payload", error: parsed.error });
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const { mam, uuid, block } = parsed.data;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const authHeader = request.headers.get("Authorization");
  if (authHeader) headers["Authorization"] = authHeader;

  const url = `${getEnigmaBaseUrl()}/assets/block/${encodeURIComponent(mam)}/${encodeURIComponent(uuid)}?block=${block}`;
  let response: Response;
  try {
    response = await fetchVMS(url, { method: "GET", headers });
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
    const errMsg =
      data && typeof data === "object" && "msg" in data
        ? String((data as Record<string, unknown>).msg)
        : `Backend returned ${response.status}`;
    return NextResponse.json({ message: errMsg }, { status: response.status });
  }

  logInfo({ name: LOG_NAME, fn: "POST", msg: "Enigma response", data });
  return NextResponse.json(data);
}
