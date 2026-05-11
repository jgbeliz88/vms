import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchCheck } from "@/app/api/_lib/http-check";
import { logInfo, logError } from "@/app/api/_lib/logger";

const LOG_NAME = "app.api.live.channel-status.route";

const requestSchema = z.object({
  pods: z.array(z.object({ podName: z.string().min(1), linearName: z.string().min(1) })),
  originBaseUrl: z.string().url(),
  cdnBaseUrl: z.string().url(),
});

function toOrilinear(podName: string): string {
  return podName.replace(/^usp/, "").replace(/[mb]$/, "");
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    logError({ name: LOG_NAME, fn: "POST", msg: "Invalid request payload", error: parsed.error });
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const { pods, originBaseUrl, cdnBaseUrl } = parsed.data;

  // Derive orilinear and deduplicate
  const seen = new Set<string>();
  const uniquePods: { orilinear: string; linearName: string }[] = [];
  for (const { podName, linearName } of pods) {
    const orilinear = toOrilinear(podName);
    if (!seen.has(orilinear)) {
      seen.add(orilinear);
      uniquePods.push({ orilinear, linearName });
    }
  }

  const podResults = await Promise.all(
    uniquePods.map(async ({ orilinear, linearName }) => {
      const base = `${originBaseUrl}/${orilinear}/live/${linearName}`;
      const cdnBase = `${cdnBaseUrl}/${orilinear}/live/${linearName}`;

      const [originManifests, originDrmManifests, cdnManifests] = await Promise.all([
        Promise.all([
          fetchCheck(`${base}/main/main.isml/.m3u8`).then((r) => ({ label: "HLS", ...r })),
          fetchCheck(`${base}/main/main.isml/.mpd`).then((r) => ({ label: "DASH", ...r })),
        ]),
        Promise.all([
          fetchCheck(`${base}/hls-fairplay/hls-fairplay.isml/.m3u8`).then((r) => ({ label: "HLS", ...r })),
          fetchCheck(`${base}/mpd-cenc/mpd-cenc.isml/.mpd`).then((r) => ({ label: "DASH", ...r })),
        ]),
        Promise.all([
          fetchCheck(`${cdnBase}/hls-fairplay/hls-fairplay.isml/.m3u8`).then((r) => ({ label: "HLS", ...r })),
          fetchCheck(`${cdnBase}/mpd-cenc/mpd-cenc.isml/.mpd`).then((r) => ({ label: "DASH", ...r })),
        ]),
      ]);

      return { orilinear, originManifests, originDrmManifests, cdnManifests };
    })
  );

  const result = {
    origin: {
      ok: podResults.every((p) => p.originManifests.every((m) => m.ok)),
      pods: podResults.map(({ orilinear, originManifests }) => ({ orilinear, manifests: originManifests })),
    },
    originDrm: {
      ok: podResults.every((p) => p.originDrmManifests.every((m) => m.ok)),
      pods: podResults.map(({ orilinear, originDrmManifests }) => ({ orilinear, manifests: originDrmManifests })),
    },
    cdn: {
      ok: podResults.every((p) => p.cdnManifests.every((m) => m.ok)),
      pods: podResults.map(({ orilinear, cdnManifests }) => ({ orilinear, manifests: cdnManifests })),
    },
  };

  logInfo({
    name: LOG_NAME,
    fn: "POST",
    msg: "End of request",
    data: { origin: result.origin.ok, originDrm: result.originDrm.ok, cdn: result.cdn.ok, uniquePods: uniquePods.length },
  });

  return NextResponse.json(result);
}
