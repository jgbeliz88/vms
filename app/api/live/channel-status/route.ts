import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchCheck } from "@/app/api/_lib/http-check";
import { mintAkamaiToken } from "@/app/api/_lib/akamai-token";
import { logInfo, logError } from "@/app/api/_lib/logger";

const LOG_NAME = "app.api.live.channel-status.route";

const requestSchema = z.object({
  pods: z.array(
    z.object({ podName: z.string().min(1), linearName: z.string().min(1), drm: z.number().nullable() })
  ),
  originBaseUrl: z.string().url(),
  cdnBaseUrl: z.string().url(),
});

const CDN_HEADERS = { Origin: "www.mediasetinfinity.es" };

// Short-lived Akamai token TTL for non-DRM CDN main-manifest checks.
const CDN_CHECK_TOKEN_WINDOW = 300;

function toOrilinear(podName: string): string {
  return podName.replace(/^usp/, "").replace(/[mb]$/, "");
}

/** Fold the CDN base URL's pathname prefix (e.g. "/staging") into the ACL path. */
function buildCdnAcl(cdnBase: string, path: string): string {
  let base = "";
  try {
    const p = new URL(cdnBase).pathname;
    base = p === "/" ? "" : p.replace(/\/$/, "");
  } catch {
    // invalid URL — use empty base
  }
  return base + path;
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    logError({ name: LOG_NAME, fn: "POST", msg: "Invalid request payload", error: parsed.error });
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const { pods, originBaseUrl, cdnBaseUrl } = parsed.data;

  // Group pods by orilinear (usp prefix + trailing m/b stripped). Origin manifests
  // are served per-pod under the main pod (name ending in "m"; "b" is backup), while
  // CDN paths use the stripped orilinear.
  const groups = new Map<string, { orilinear: string; linearName: string; drm: number | null; podNames: string[] }>();
  for (const { podName, linearName, drm } of pods) {
    const orilinear = toOrilinear(podName);
    const group = groups.get(orilinear);
    if (group) {
      group.podNames.push(podName);
    } else {
      groups.set(orilinear, { orilinear, linearName, drm, podNames: [podName] });
    }
  }
  const uniquePods = [...groups.values()].map(({ orilinear, linearName, drm, podNames }) => ({
    orilinear,
    linearName,
    drm,
    originPodName: podNames.find((n) => n.endsWith("m")) ?? podNames[0],
  }));

  const podResults = await Promise.all(
    uniquePods.map(async ({ orilinear, linearName, drm, originPodName }) => {
      const base = `${originBaseUrl}/${originPodName}/live/${linearName}`;
      const cdnBase = `${cdnBaseUrl}/${orilinear}/live/${linearName}`;
      const noDrm = drm === 0;

      // Origin non-DRM manifests are always checked.
      const originPromise = Promise.all([
        fetchCheck(`${base}/main/main.isml/.m3u8`).then((r) => ({ label: "HLS", ...r })),
        fetchCheck(`${base}/main/main.isml/.mpd`).then((r) => ({ label: "DASH", ...r })),
      ]);

      // Non-DRM linears have no DRM manifests — skip the Origin (DRM) checks entirely.
      const originDrmPromise = noDrm
        ? Promise.resolve([])
        : Promise.all([
            fetchCheck(`${base}/hls-fairplay/hls-fairplay.isml/.m3u8`).then((r) => ({ label: "HLS", ...r })),
            fetchCheck(`${base}/mpd-cenc/mpd-cenc.isml/.mpd`).then((r) => ({ label: "DASH", ...r })),
          ]);

      // CDN: DRM linears check the DRM manifests; non-DRM linears check the main
      // manifests, which on the CDN require a short-lived Akamai token.
      const cdnPromise = noDrm
        ? (async () => {
            const acl = buildCdnAcl(cdnBaseUrl, `/${orilinear}/live/${linearName}/*`);
            const token = await mintAkamaiToken(acl, "live", CDN_CHECK_TOKEN_WINDOW);
            const query = token ? `?${token}` : "";
            return Promise.all([
              fetchCheck(`${cdnBase}/main/main.isml/.m3u8${query}`, CDN_HEADERS).then((r) => ({ label: "HLS", ...r })),
              fetchCheck(`${cdnBase}/main/main.isml/.mpd${query}`, CDN_HEADERS).then((r) => ({ label: "DASH", ...r })),
            ]);
          })()
        : Promise.all([
            fetchCheck(`${cdnBase}/hls-fairplay/hls-fairplay.isml/.m3u8`, CDN_HEADERS).then((r) => ({ label: "HLS", ...r })),
            fetchCheck(`${cdnBase}/mpd-cenc/mpd-cenc.isml/.mpd`, CDN_HEADERS).then((r) => ({ label: "DASH", ...r })),
          ]);

      const [originManifests, originDrmManifests, cdnManifests] = await Promise.all([
        originPromise,
        originDrmPromise,
        cdnPromise,
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
      // Non-DRM pods contribute no DRM manifests — omit them from the section list.
      pods: podResults
        .filter((p) => p.originDrmManifests.length > 0)
        .map(({ orilinear, originDrmManifests }) => ({ orilinear, manifests: originDrmManifests })),
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
