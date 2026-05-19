import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchVMS } from "@/app/api/_lib/fetch";
import { logInfo, logError } from "@/app/api/_lib/logger";

const LOG_NAME = "app.api.live.diagnostics.route";

const requestSchema = z.object({
  url: z.string().url()
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    logError({ name: LOG_NAME, fn: "POST", msg: "Invalid request payload", error: parsed.error });
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const url = parsed.data.url;

  let response: Response;
  try {
    response = await fetchVMS(url, {
      signal: AbortSignal.timeout(10000),
      cache: "no-store"
    });
  } catch (error) {
    logError({ name: LOG_NAME, fn: "POST", msg: `Fetch failed url=${url}`, error });
    return NextResponse.json(
      {
        url,
        status: "error",
        error: error instanceof Error ? error.message : "Diagnostics failed"
      },
      { status: 200 }
    );
  }

  const httpStatus = response.status;
  const bodyText = await response.text();

  if (httpStatus >= 400) {
    logError({ name: LOG_NAME, fn: "POST", msg: `Non-OK response url=${url}`, error: new Error(`HTTP ${httpStatus}`) });
    return NextResponse.json(
      { url, status: "error", httpStatus, error: `HTTP ${httpStatus}` },
      { status: 200 }
    );
  }

  logInfo({ name: LOG_NAME, fn: "POST", msg: "End of request", data: { url, status: "ready", httpStatus } });
  return NextResponse.json({ url, status: "ready", httpStatus, manifest: bodyText });
}
