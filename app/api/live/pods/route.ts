import { NextResponse } from "next/server";
import { z } from "zod";
import { getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";
import { logInfo, logError } from "@/app/api/_lib/logger";

const LOG_NAME = "app.api.live.pods.route";

const createPodSchema = z.object({
  encoderId: z.number(),
  name: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createPodSchema.safeParse(body);
  if (!parsed.success) {
    logError({ name: LOG_NAME, fn: "POST", msg: "Invalid request payload", error: parsed.error });
    return NextResponse.json({ message: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  const url = `${getEnigmaBaseUrl()}/live/pods`;
  let response: Response;
  try {
    response = await fetchVMS(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
  } catch (err) {
    logError({ name: LOG_NAME, fn: "POST", msg: `Fetch failed url=${url}`, error: err });
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }

  if (!response.ok) {
    const text = await response.text();
    logError({ name: LOG_NAME, fn: "POST", msg: `Non-OK response url=${url}`, error: new Error(`HTTP ${response.status}: ${text}`) });
    return NextResponse.json(
      { message: `Backend error: ${text}` },
      { status: response.status }
    );
  }

  const data = await response.json();
  logInfo({ name: LOG_NAME, fn: "POST", msg: "Enigma response", data });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const podId = searchParams.get("podId");
  if (!podId) {
    return NextResponse.json({ message: "podId is required" }, { status: 400 });
  }

  const url = `${getEnigmaBaseUrl()}/live/pods/${podId}`;
  let response: Response;
  try {
    response = await fetchVMS(url, { method: "DELETE" });
  } catch (err) {
    logError({ name: LOG_NAME, fn: "DELETE", msg: `Fetch failed url=${url}`, error: err });
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }

  if (!response.ok) {
    const text = await response.text();
    logError({ name: LOG_NAME, fn: "DELETE", msg: `Non-OK response url=${url}`, error: new Error(`HTTP ${response.status}: ${text}`) });
    return NextResponse.json(
      { message: `Backend error: ${text}` },
      { status: response.status }
    );
  }

  logInfo({ name: LOG_NAME, fn: "DELETE", msg: "Enigma response", data: { ok: true, podId } });
  return NextResponse.json({ ok: true });
}
