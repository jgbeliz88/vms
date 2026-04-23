import { NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  id: z.string().min(1)
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  // TODO: Replace with real backend endpoint call once available.
  return NextResponse.json({ ok: true, id: parsed.data.id });
}
