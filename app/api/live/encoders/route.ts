import { NextResponse } from "next/server";
import { z } from "zod";
import { getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";
import { zodError } from "@/app/api/_lib/responses";
import { fetchVMS } from "@/app/api/_lib/fetch";
import { logInfo, logError } from "@/app/api/_lib/logger";

const LOG_NAME = "app.api.live.encoders.route";

const createEncoderSchema = z.object({
  encoderChannel: z.string().min(1),
  heroName: z.string().min(1),
});

export async function GET() {
  const url = `${getEnigmaBaseUrl()}/live/encoders`;
  let response: Response;
  try {
    response = await fetchVMS(url);
  } catch (err) {
    logError({ name: LOG_NAME, fn: "GET", msg: `Fetch failed url=${url}`, error: err });
    return NextResponse.json([]);
  }
  if (!response.ok) {
    logError({ name: LOG_NAME, fn: "GET", msg: `Non-OK response url=${url}`, error: new Error(`HTTP ${response.status}`) });
    return NextResponse.json([]);
  }
  const data = await response.json();
  logInfo({ name: LOG_NAME, fn: "GET", msg: "Enigma response", data });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createEncoderSchema.safeParse(body);
  if (!parsed.success) {
    logError({ name: LOG_NAME, fn: "POST", msg: "Invalid request payload", error: parsed.error });
    return zodError(parsed.error.issues);
  }

  const url = `${getEnigmaBaseUrl()}/live/encoders`;
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
  const encoderId = searchParams.get("encoderId");
  if (!encoderId) {
    return NextResponse.json({ message: "encoderId is required" }, { status: 400 });
  }

  const url = `${getEnigmaBaseUrl()}/live/encoders/${encoderId}`;
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

  logInfo({ name: LOG_NAME, fn: "DELETE", msg: "Enigma response", data: { ok: true, encoderId } });
  return NextResponse.json({ ok: true });
}
