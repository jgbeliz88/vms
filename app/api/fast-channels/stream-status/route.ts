import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchCheck } from "@/app/api/_lib/http-check";
import { logInfo, logError } from "@/app/api/_lib/logger";

const LOG_NAME = "app.api.fast-channels.stream-status.route";

const requestSchema = z.object({
  uri: z.string().url()
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    logError({ name: LOG_NAME, fn: "POST", msg: "Invalid request payload", error: parsed.error });
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const { uri } = parsed.data;
  const parsed_url = new URL(uri);
  const channelName = parsed_url.pathname.split("/").filter(Boolean).pop() ?? "";
  const base = `${parsed_url.origin}/${channelName}`;
  const urls = [`${base}.isml/.mpd`, `${base}.isml/.m3u8`];

  const results = await Promise.all(urls.map((url) => fetchCheck(url)));
  const ok = results.every((r) => r.ok);

  logInfo({ name: LOG_NAME, fn: "POST", msg: "End of request", data: { ok, urls: results } });
  return NextResponse.json({ ok, urls: results });
}
