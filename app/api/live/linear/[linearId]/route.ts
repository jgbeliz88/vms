import { NextResponse } from "next/server";
import { z } from "zod";
import { getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";
import { logInfo, logError } from "@/app/api/_lib/logger";
import { extractUpstreamMessage, zodError } from "@/app/api/_lib/responses";
import { AVAILABLE_TAGS } from "@/components/ui/TagChip";

const LOG_NAME = "app.api.live.linear.[linearId].route";

const moveSchema = z
  .object({
    channelId: z.number().int().positive(),
  })
  .strict();

// Same pod shape as add-linear. Only the fields that changed are sent.
const updateSchema = z
  .object({
    tags: z.array(z.enum(AVAILABLE_TAGS)).min(1).optional(),
    pods: z
      .array(z.object({ name: z.string().min(1), encoders: z.array(z.number().int()) }))
      .min(1)
      .optional(),
  })
  .strict()
  .refine((d) => d.tags !== undefined || d.pods !== undefined, { message: "Nothing to update" });

const schema = z.union([moveSchema, updateSchema]);

// Reassigns a linear to another channel ({ channelId }), or updates its tags and/or pods ({ tags?, pods? }).
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ linearId: string }> }
) {
  const { linearId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    logError({ name: LOG_NAME, fn: "PUT", msg: "Invalid request payload", error: parsed.error });
    return zodError(parsed.error.issues);
  }

  const url = `${getEnigmaBaseUrl()}/live/linear/${linearId}`;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const authHeader = request.headers.get("Authorization");
  if (authHeader) headers["Authorization"] = authHeader;

  let response: Response;
  try {
    response = await fetchVMS(url, {
      method: "PUT",
      headers,
      body: JSON.stringify(parsed.data),
    });
  } catch (error: unknown) {
    logError({ name: LOG_NAME, fn: "PUT", msg: `Fetch failed url=${url}`, error });
    const msg = error instanceof Error ? error.message : "Request failed";
    return NextResponse.json({ message: msg }, { status: 500 });
  }

  const text = await response.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!response.ok) {
    logError({ name: LOG_NAME, fn: "PUT", msg: `Non-OK response url=${url}`, error: new Error(`HTTP ${response.status}: ${text}`) });
    return NextResponse.json(
      { message: extractUpstreamMessage(text, response.status), data },
      { status: response.status }
    );
  }

  logInfo({ name: LOG_NAME, fn: "PUT", msg: "Enigma response", data: { status: response.status, data } });
  return NextResponse.json(data);
}
