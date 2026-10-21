import "server-only";
import { getEnigmaBaseUrl, getAkamaiLiveKey, getAkamaiVodKey } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";
import { logError } from "@/app/api/_lib/logger";

const LOG_NAME = "app.api._lib.akamai-token";

/**
 * Mint an Akamai CDN token for the given ACL by delegating to the Enigma backend
 * (`POST ${ENIGMA_BASE_URL}/cdn/token/akamai`). Returns the token string (the
 * backend's `cdn` field), or `null` if the request fails so callers can degrade
 * gracefully.
 */
export async function mintAkamaiToken(
  acl: string,
  contentType: "live" | "vod",
  windowSeconds: number
): Promise<string | null> {
  const key = contentType === "vod" ? getAkamaiVodKey() : getAkamaiLiveKey();
  const url = `${getEnigmaBaseUrl()}/cdn/token/akamai`;
  try {
    const response = await fetchVMS(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acl, key, window: windowSeconds }),
    });
    if (!response.ok) {
      logError({
        name: LOG_NAME,
        fn: "mintAkamaiToken",
        msg: `Non-OK response url=${url}`,
        error: new Error(`HTTP ${response.status}`),
      });
      return null;
    }
    const data = await response.json();
    const token = (data as Record<string, unknown>)?.cdn;
    return typeof token === "string" ? token : null;
  } catch (error: unknown) {
    logError({ name: LOG_NAME, fn: "mintAkamaiToken", msg: `Fetch failed url=${url}`, error });
    return null;
  }
}
