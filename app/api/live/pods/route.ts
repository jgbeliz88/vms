import { NextResponse } from "next/server";
import { z } from "zod";
import { getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";

const createPodSchema = z.object({
  encoderId: z.number(),
  name: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createPodSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  const response = await fetchVMS(`${getEnigmaBaseUrl()}/live/pods`, {
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
  const podId = searchParams.get("podId");
  if (!podId) {
    return NextResponse.json({ message: "podId is required" }, { status: 400 });
  }

  const response = await fetchVMS(`${getEnigmaBaseUrl()}/live/pods/${podId}`, {
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
