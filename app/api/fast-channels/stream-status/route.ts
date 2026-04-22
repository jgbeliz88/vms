import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchCheck } from "@/app/api/_lib/http-check";

const requestSchema = z.object({
  uri: z.string().url()
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const { uri } = parsed.data;
  const parsed_url = new URL(uri);
  const channelName = parsed_url.pathname.split("/").filter(Boolean).pop() ?? "";
  const base = `${parsed_url.origin}/${channelName}`;
  const urls = [`${base}.isml/.mpd`, `${base}.isml/.m3u8`];

  const results = await Promise.all(urls.map(fetchCheck));
  const ok = results.every((r) => r.ok);

  return NextResponse.json({ ok, urls: results });
}
