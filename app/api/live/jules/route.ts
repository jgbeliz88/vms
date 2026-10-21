import { NextResponse } from "next/server";
import { z } from "zod";
import { getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";
import { logInfo, logError } from "@/app/api/_lib/logger";

const COMMAND_MAP = {
  scte:     { endpoint: "/scte",     method: "POST", contentType: "application/xml" },
  admode:   { endpoint: "/id3",      method: "POST", contentType: "application/json" },
  blackout: { endpoint: "/controls", method: "PUT",  contentType: "application/json" },
} as const;

const requestSchema = z.object({
  linearIds: z.array(z.number().int().positive()).min(1),
  command: z.enum(["scte", "admode", "blackout"]),
  payload: z.string().min(1),
});

type EncoderResult = {
  linearId: number;
  encoderName: string;
  status: "fulfilled" | "rejected";
  error?: string;
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    logError({ name: "app.api.live.jules.route", fn: "POST", msg: "Invalid request payload", error: parsed.error });
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const { linearIds, command, payload } = parsed.data;
  const { endpoint, method, contentType } = COMMAND_MAP[command];
  const baseUrl = getEnigmaBaseUrl();

  const settled = await Promise.allSettled(
    linearIds.map(async (linearId) => {
      const url = `${baseUrl}/mediaexcel/linear/${linearId}${endpoint}`;
      let response: Response;
      try {
        response = await fetchVMS(url, {
          method,
          headers: { "Content-Type": contentType },
          body: payload,
        });
      } catch (fetchError) {
        logError({ name: "app.api.live.jules.route", fn: "POST", msg: `Fetch failed for linearId=${linearId} url=${url}`, error: fetchError });
        throw fetchError;
      }
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        const error = new Error(`HTTP ${response.status}${text ? `: ${text}` : ""}`);
        logError({ name: "app.api.live.jules.route", fn: "POST", msg: `Non-OK response for linearId=${linearId} url=${url}`, error });
        throw error;
      }
      const data = await response.json() as { results?: { encoderName: string; status: string; error?: string }[] };
      return { linearId, results: data.results ?? [] };
    })
  );

  const aggregated: EncoderResult[] = settled.flatMap((result, i) => {
    if (result.status === "fulfilled") {
      const { linearId, results } = result.value;
      return results.map((r) => ({
        linearId,
        encoderName: r.encoderName,
        status: (r.status === "fulfilled" ? "fulfilled" : "rejected") as "fulfilled" | "rejected",
        ...(r.error ? { error: r.error } : {}),
      }));
    }
    return [{
      linearId: linearIds[i],
      encoderName: "unknown",
      status: "rejected" as const,
      error: result.reason instanceof Error ? result.reason.message : "Unknown error",
    }];
  });

  logInfo({ name: "app.api.live.jules.route", fn: "POST", msg: "End of request", data: { results: aggregated } });

  return NextResponse.json({ results: aggregated });
}
