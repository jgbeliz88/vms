import { NextResponse } from "next/server";
import { z } from "zod";
import { getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";
import { zodError } from "@/app/api/_lib/responses";

const createEncoderSchema = z.object({
  encoderChannel: z.string().min(1),
  heroName: z.string().min(1),
});

export async function GET() {
  const response = await fetch(`${getEnigmaBaseUrl()}/live/encoders`);
  if (!response.ok) {
    return NextResponse.json([]);
  }
  return NextResponse.json(await response.json());
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createEncoderSchema.safeParse(body);
  if (!parsed.success) {
    return zodError(parsed.error.issues);
  }

  const response = await fetch(`${getEnigmaBaseUrl()}/live/encoders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed.data),
  });

  if (!response.ok) {
    const text = await response.text();
    return NextResponse.json(
      { message: `Backend error: ${text}` },
      { status: response.status }
    );
  }

  return NextResponse.json(await response.json(), { status: 201 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const encoderId = searchParams.get("encoderId");
  if (!encoderId) {
    return NextResponse.json({ message: "encoderId is required" }, { status: 400 });
  }

  const response = await fetch(`${getEnigmaBaseUrl()}/live/encoders/${encoderId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const text = await response.text();
    return NextResponse.json(
      { message: `Backend error: ${text}` },
      { status: response.status }
    );
  }

  return NextResponse.json({ ok: true });
}
