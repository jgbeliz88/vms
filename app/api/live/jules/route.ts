import { NextResponse } from "next/server";
import { z } from "zod";
import { getJulesBaseUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";
import { logInfo, logError } from "@/app/api/_lib/logger";

const COMMAND_MAP = {
  scte: { endpoint: "/scte", method: "POST", contentType: "text/xml" },
  admode: { endpoint: "/id3", method: "POST", contentType: "application/json" },
  blackout: { endpoint: "/controls", method: "PUT", contentType: "application/json" },
} as const;

const requestSchema = z.object({
  julesIds: z.array(z.string().min(1)).min(1),
  command: z.enum(["scte", "admode", "blackout"]),
  payload: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    logError({ name: "app.api.live.jules.route", fn: "POST", msg: "Invalid request payload", error: parsed.error });
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const { julesIds, command, payload } = parsed.data;
  const { endpoint, method, contentType } = COMMAND_MAP[command];
  const baseUrl = getJulesBaseUrl();

  const results = await Promise.allSettled(
    julesIds.map(async (julesId) => {
      const url = baseUrl.replace("{jules_id}", julesId) + endpoint;
      let response: Response;
      try {
        response = await fetchVMS(url, {
          method,
          headers: { "Content-Type": contentType },
          body: payload,
        });
      } catch (fetchError) {
        logError({ name: "app.api.live.jules.route", fn: "POST", msg: `Fetch failed for julesId=${julesId} url=${url}`, error: fetchError });
        throw fetchError;
      }
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        const error = new Error(`HTTP ${response.status}${text ? `: ${text}` : ""}`);
        logError({ name: "app.api.live.jules.route", fn: "POST", msg: `Non-OK response for julesId=${julesId} url=${url}`, error });
        throw error;
      }
      return julesId;
    })
  );

  const aggregated = results.map((result, i) => {
    if (result.status === "fulfilled") {
      return { julesId: julesIds[i], success: true };
    }
    return {
      julesId: julesIds[i],
      success: false,
      error: result.reason instanceof Error ? result.reason.message : "Unknown error",
    };
  });

  logInfo({ name: "app.api.live.jules.route", fn: "POST", msg: "End of request", data: { results: aggregated } });

  return NextResponse.json({ results: aggregated });
}
