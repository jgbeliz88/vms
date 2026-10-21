import "server-only";

export function fetchVMS(url: string | URL | Request, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("User-Agent", "VMS");
  return fetch(url, { ...init, headers });
}
