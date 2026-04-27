import "server-only";
import { fetchVMS } from "@/app/api/_lib/fetch";

export async function fetchCheck(url: string): Promise<{ url: string; ok: boolean; httpStatus: number }> {
  try {
    const response = await fetchVMS(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(10000),
      cache: "no-store"
    });
    return { url, ok: response.status >= 200 && response.status < 400, httpStatus: response.status };
  } catch {
    return { url, ok: false, httpStatus: 0 };
  }
}
