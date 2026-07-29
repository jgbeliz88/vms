import { NextResponse } from "next/server";
import { z } from "zod";
import { getAteneaBaseUrl, getAteneaToken } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";
import { zodError, extractUpstreamMessage } from "@/app/api/_lib/responses";
import { logInfo, logError } from "@/app/api/_lib/logger";

const LOG_NAME = "app.api.cdn.routing.providers.route";

const bodySchema = z.object({
  // Only the configurations the user actually changed — Atenea merges the rest.
  configurations: z
    .array(
      z.object({
        name: z.string().min(1),
        active: z.boolean(),
        // passthrough so provider entries Atenea adds later survive the round trip
        payload: z.record(z.object({ priority: z.number().int().positive() }).passthrough()),
      })
    )
    .min(1),
});

export async function PUT(request: Request) {
  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    logError({ name: LOG_NAME, fn: "PUT", msg: "Invalid request payload", error: parsed.error });
    return zodError(parsed.error.issues);
  }

  const url = `${getAteneaBaseUrl()}/api/projects/multisite/caronte/services/cdn-config`;
  // Atenea authenticates writes with a service token. Skip the header when it is
  // not configured so the call behaves as before instead of sending an empty bearer.
  const token = getAteneaToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetchVMS(url, {
      method: "PUT",
      headers,
      body: JSON.stringify({ data: { configurations: parsed.data.configurations } }),
    });
  } catch (err) {
    logError({ name: LOG_NAME, fn: "PUT", msg: `Fetch failed url=${url}`, error: err });
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }

  if (!response.ok) {
    const text = await response.text();
    logError({
      name: LOG_NAME,
      fn: "PUT",
      msg: `Non-OK response url=${url}`,
      error: new Error(`HTTP ${response.status}: ${text}`),
    });
    return NextResponse.json(
      { message: extractUpstreamMessage(text, response.status) },
      { status: response.status }
    );
  }

  const data = await response.json();
  logInfo({ name: LOG_NAME, fn: "PUT", msg: "Atenea response", data });
  return NextResponse.json(data);
}
