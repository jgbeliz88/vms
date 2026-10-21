import { NextResponse } from "next/server";
import { z } from "zod";
import { getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";
import { logInfo, logError } from "@/app/api/_lib/logger";
import { extractUpstreamMessage } from "@/app/api/_lib/responses";

const LOG_NAME = "app.api.cron-jobs.[id].run.route";

const TRANSITION_TYPE = "VC_TRANSITION_PUT";

// The caller only sends an id: the method, path and body all come from the cron job
// Enigma has stored, so the browser can never point this route at an arbitrary endpoint.
const cronJobSchema = z.object({
  id: z.string(),
  type: z.string(),
  method: z.enum(["POST", "PUT", "PATCH"]),
  path: z.string().startsWith("/"),
  body: z.string()
});

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const base = getEnigmaBaseUrl();

  const lookupUrl = `${base}/cron-jobs/${encodeURIComponent(id)}?includeBody=true`;
  let lookup: Response;
  try {
    lookup = await fetchVMS(lookupUrl, { cache: "no-store" });
  } catch (error) {
    logError({ name: LOG_NAME, fn: "POST", msg: `Fetch failed url=${lookupUrl}`, error });
    const message = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ message }, { status: 500 });
  }
  if (!lookup.ok) {
    const text = await lookup.text().catch(() => "");
    logError({ name: LOG_NAME, fn: "POST", msg: `Non-OK response url=${lookupUrl}`, error: new Error(`HTTP ${lookup.status}${text ? `: ${text}` : ""}`) });
    return NextResponse.json({ message: extractUpstreamMessage(text, lookup.status) }, { status: lookup.status });
  }

  const parsed = cronJobSchema.safeParse(await lookup.json().catch(() => null));
  if (!parsed.success) {
    logError({ name: LOG_NAME, fn: "POST", msg: `Unexpected cron job shape id=${id}`, error: parsed.error });
    return NextResponse.json({ message: "Cron job is missing the data needed to run it" }, { status: 502 });
  }
  const job = parsed.data;

  if (job.type !== TRANSITION_TYPE) {
    logError({ name: LOG_NAME, fn: "POST", msg: `Refusing to run cron job id=${id}`, error: new Error(`Unsupported type ${job.type}`) });
    return NextResponse.json({ message: `Only ${TRANSITION_TYPE} cron jobs can be run from VMS` }, { status: 404 });
  }

  // The stored body is a JSON document serialised to a string; Enigma expects it back as JSON.
  let payload: unknown;
  try {
    payload = JSON.parse(job.body);
  } catch (error) {
    logError({ name: LOG_NAME, fn: "POST", msg: `Stored body is not valid JSON id=${id}`, error });
    return NextResponse.json({ message: "Cron job body is not valid JSON" }, { status: 502 });
  }

  const runUrl = `${base}${job.path}`;
  let response: Response;
  try {
    response = await fetchVMS(runUrl, {
      method: job.method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store"
    });
  } catch (error) {
    logError({ name: LOG_NAME, fn: "POST", msg: `Fetch failed url=${runUrl}`, error });
    const message = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ message }, { status: 500 });
  }
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    logError({ name: LOG_NAME, fn: "POST", msg: `Non-OK response url=${runUrl}`, error: new Error(`HTTP ${response.status}${text ? `: ${text}` : ""}`) });
    return NextResponse.json({ message: extractUpstreamMessage(text, response.status) }, { status: response.status });
  }

  const data = await response.json().catch(() => ({}));
  logInfo({ name: LOG_NAME, fn: "POST", msg: "Enigma response", data: { id, method: job.method, path: job.path } });
  return NextResponse.json(data);
}
