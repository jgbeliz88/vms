import { NextResponse } from "next/server";
import { z } from "zod";
import { zodError, extractUpstreamMessage } from "@/app/api/_lib/responses";
import { getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";
import { logInfo, logError } from "@/app/api/_lib/logger";

const LOG_NAME = "app.api.live.channels.[id].route";

const patchSchema = z.object({
  metadata: z.record(z.unknown()),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const channelId = parseInt(id, 10);
  if (isNaN(channelId)) {
    return NextResponse.json({ message: "Invalid channel id" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    logError({ name: LOG_NAME, fn: "PATCH", msg: "Invalid request payload", error: parsed.error });
    return zodError(parsed.error.issues);
  }

  const enigmaBase = getEnigmaBaseUrl();
  const url = `${enigmaBase}/live/channel/${channelId}`;
  let response: Response;
  try {
    response = await fetchVMS(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
  } catch (err) {
    logError({ name: LOG_NAME, fn: "PATCH", msg: `Fetch failed url=${url}`, error: err });
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }

  if (!response.ok) {
    const text = await response.text();
    logError({ name: LOG_NAME, fn: "PATCH", msg: `Non-OK response url=${url}`, error: new Error(`HTTP ${response.status}: ${text}`) });
    return NextResponse.json({ message: extractUpstreamMessage(text, response.status) }, { status: response.status });
  }

  const data = await response.json();
  logInfo({ name: LOG_NAME, fn: "PATCH", msg: "Enigma response", data });
  return NextResponse.json(data);
}
