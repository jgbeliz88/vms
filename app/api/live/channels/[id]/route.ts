import { NextResponse } from "next/server";
import { z } from "zod";
import { zodError } from "@/app/api/_lib/responses";
import { getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";

const patchSchema = z.object({
  metadata: z.record(z.unknown()),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const channelId = parseInt(id, 10);
  if (isNaN(channelId)) {
    return NextResponse.json({ message: "Invalid channel id" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return zodError(parsed.error.issues);
  }

  const enigmaBase = getEnigmaBaseUrl();
  const response = await fetchVMS(`${enigmaBase}/live/channels/${channelId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed.data),
  });

  if (!response.ok) {
    const text = await response.text();
    return NextResponse.json({ message: `Backend error: ${text}` }, { status: response.status });
  }

  return NextResponse.json(await response.json());
}
