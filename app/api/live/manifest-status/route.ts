import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchCheck } from "@/app/api/_lib/http-check";
import { logInfo, logError } from "@/app/api/_lib/logger";

const LOG_NAME = "app.api.live.manifest-status.route";

const requestSchema = z.object({
  pods: z.array(z.object({ podName: z.string().min(1), linearName: z.string().min(1) })),
  originBaseUrl: z.string().url()
});

const MANIFEST_TYPES = [
  { label: "HLS", path: () => `main/main.isml/.m3u8` },
  { label: "HLS DRM", path: () => `hls-fairplay/hls-fairplay.isml/.m3u8` },
  { label: "DASH", path: () => `main/main.isml/.mpd` },
  { label: "DASH DRM", path: () => `mpd-cenc/mpd-cenc.isml/.mpd` }
] as const;

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    logError({ name: LOG_NAME, fn: "POST", msg: "Invalid request payload", error: parsed.error });
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const { pods, originBaseUrl } = parsed.data;

  // Deduplicate by podName
  const uniquePods = Array.from(new Map(pods.map((p) => [p.podName, p])).values());

  const podResults = await Promise.all(
    uniquePods.map(async ({ podName, linearName }) => {
      const base = `${originBaseUrl}/${podName}/live/${linearName}`;
      const manifests = await Promise.all(
        MANIFEST_TYPES.map(({ label, path }) => {
          const url = `${base}/${path()}`;
          return fetchCheck(url).then((r) => ({ label, ...r }));
        })
      );
      return { podName, manifests };
    })
  );

  const allOk = podResults.every((p) => p.manifests.every((m) => m.ok));
  logInfo({ name: LOG_NAME, fn: "POST", msg: "End of request", data: { ok: allOk, pods: podResults } });

  return NextResponse.json({ ok: allOk, pods: podResults });
}
