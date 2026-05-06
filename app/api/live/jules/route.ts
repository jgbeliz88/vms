import { NextResponse } from "next/server";
import { z } from "zod";
import { getJulesBaseUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";
import { logInfo } from "@/app/api/_lib/logger";

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
  logInfo({ name: "app.api.live.jules.route", fn: "POST", msg: "Start of request"});

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const { julesIds, command, payload } = parsed.data;
  const { endpoint, method, contentType } = COMMAND_MAP[command];
  const baseUrl = getJulesBaseUrl();

  const results = await Promise.allSettled(
    julesIds.map(async (julesId) => {
      const url = baseUrl.replace("{jules_id}", julesId) + endpoint;
      const response = await fetchVMS(url, {
        method,
        headers: { "Content-Type": contentType },
        body: payload,
      });
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`HTTP ${response.status}${text ? `: ${text}` : ""}`);
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
