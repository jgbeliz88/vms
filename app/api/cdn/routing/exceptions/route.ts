import { NextResponse } from "next/server";
import { z } from "zod";
import { getAteneaBaseUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";
import { zodError, extractUpstreamMessage } from "@/app/api/_lib/responses";
import { logInfo, logError } from "@/app/api/_lib/logger";

const LOG_NAME = "app.api.cdn.routing.exceptions.route";

const bodySchema = z.object({
  documentId: z.string().min(1),
  // Full replacement array: the client merges its channel toggles into the values
  // it read, so entries the VMS does not own survive the round trip.
  values: z.array(z.string()),
});

export async function PUT(request: Request) {
  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    logError({ name: LOG_NAME, fn: "PUT", msg: "Invalid request payload", error: parsed.error });
    return zodError(parsed.error.issues);
  }

  const { documentId, values } = parsed.data;
  const url = `${getAteneaBaseUrl()}/api/features/${documentId}`;
  let response: Response;
  try {
    response = await fetchVMS(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: { values } }),
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
