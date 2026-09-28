import { NextResponse } from "next/server";
import { z } from "zod";
import { getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";
import { logInfo, logError } from "@/app/api/_lib/logger";
import { extractUpstreamMessage, zodError } from "@/app/api/_lib/responses";

const LOG_NAME = "app.api.live.linear.[linearId].route";

const schema = z.object({
  channelId: z.number().int().positive(),
});

// Reassigns a linear to another channel.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ linearId: string }> }
) {
  const { linearId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    logError({ name: LOG_NAME, fn: "PUT", msg: "Invalid request payload", error: parsed.error });
    return zodError(parsed.error.issues);
  }

  const url = `${getEnigmaBaseUrl()}/live/linear/${linearId}`;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const authHeader = request.headers.get("Authorization");
  if (authHeader) headers["Authorization"] = authHeader;

  let response: Response;
  try {
    response = await fetchVMS(url, {
      method: "PUT",
      headers,
      body: JSON.stringify(parsed.data),
    });
  } catch (error: unknown) {
    logError({ name: LOG_NAME, fn: "PUT", msg: `Fetch failed url=${url}`, error });
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
    logError({ name: LOG_NAME, fn: "PUT", msg: `Non-OK response url=${url}`, error: new Error(`HTTP ${response.status}: ${text}`) });
    return NextResponse.json(
      { message: extractUpstreamMessage(text, response.status), data },
      { status: response.status }
    );
  }

  logInfo({ name: LOG_NAME, fn: "PUT", msg: "Enigma response", data: { status: response.status, data } });
  return NextResponse.json(data);
}
