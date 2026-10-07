import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchCheck } from "@/app/api/_lib/http-check";
import { logInfo, logError } from "@/app/api/_lib/logger";

const LOG_NAME = "app.api.live.manifest-status.route";

const requestSchema = z.object({
  pods: z.array(
    z.object({ podName: z.string().min(1), linearName: z.string().min(1), drm: z.number().nullable() })
  ),
  originBaseUrl: z.string().url()
});

const MAIN_MANIFEST_TYPES = [
  { label: "HLS", path: () => `main/main.isml/.m3u8` },
  { label: "DASH", path: () => `main/main.isml/.mpd` }
] as const;

const DRM_MANIFEST_TYPES = [
  { label: "HLS DRM", path: () => `hls-fairplay/hls-fairplay.isml/.m3u8` },
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
    uniquePods.map(async ({ podName, linearName, drm }) => {
      const base = `${originBaseUrl}/${podName}/live/${linearName}`;
      const check = (types: readonly { label: string; path: () => string }[]) =>
        Promise.all(types.map(({ label, path }) => fetchCheck(`${base}/${path()}`).then((r) => ({ label, ...r }))));

      // Non-DRM linears have no DRM manifests — checking them always fails, so skip.
      const [mainManifests, drmManifests] = await Promise.all([
        check(MAIN_MANIFEST_TYPES),
        drm === 0 ? Promise.resolve([]) : check(DRM_MANIFEST_TYPES),
      ]);

      // Main manifests are sometimes blocked by hand at the origin (403) so the linear
      // only plays through DRM. Treat that as intentional only when every main manifest
      // is exactly 403 and every DRM manifest is exactly 200; anything else is a failure.
      const mainBlocked =
        drm !== 0 &&
        drmManifests.length > 0 &&
        mainManifests.every((m) => m.httpStatus === 403) &&
        drmManifests.every((m) => m.httpStatus === 200);

      const manifests = [
        ...mainManifests.map((m) => ({ ...m, blocked: mainBlocked })),
        ...drmManifests.map((m) => ({ ...m, blocked: false })),
      ];
      return { podName, manifests, mainBlocked };
    })
  );

  const allOk = podResults.every((p) => p.manifests.every((m) => m.ok || m.blocked));
  const blockedPods = podResults.filter((p) => p.mainBlocked).length;
  logInfo({ name: LOG_NAME, fn: "POST", msg: "End of request", data: { ok: allOk, blockedPods, pods: podResults } });

  return NextResponse.json({ ok: allOk, pods: podResults });
}
