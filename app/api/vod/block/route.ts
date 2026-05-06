import { NextResponse } from "next/server";
import { z } from "zod";
import { getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";

const requestSchema = z.object({
  mam: z.string().min(1),
  uuid: z.string().min(1),
  block: z.boolean(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const { mam, uuid, block } = parsed.data;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const authHeader = request.headers.get("Authorization");
  if (authHeader) headers["Authorization"] = authHeader;

  try {
    const url = `${getEnigmaBaseUrl()}/assets/block/${encodeURIComponent(mam)}/${encodeURIComponent(uuid)}?block=${block}`;
    const response = await fetchVMS(url, { method: "GET", headers });

    const text = await response.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!response.ok) {
      const errMsg =
        data && typeof data === "object" && "msg" in data
          ? String((data as Record<string, unknown>).msg)
          : `Backend returned ${response.status}`;
      return NextResponse.json({ message: errMsg }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Request failed";
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
