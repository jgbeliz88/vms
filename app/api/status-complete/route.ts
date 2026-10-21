import { NextResponse } from "next/server";
import { getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";
import { fetchCheck } from "@/app/api/_lib/http-check";

export async function GET() {
  const enigmaUrl = getEnigmaBaseUrl();
  const [enigmaReachable] = await Promise.all([fetchCheck(`${enigmaUrl}/status/simple`)]);

  const checks = {
    enigmaReachable: enigmaReachable.ok,
  };

  const ok = Object.values(checks).every(Boolean);

  return NextResponse.json(
    { status: ok ? "OK" : "KO", checks },
    { status: ok ? 200 : 503 },
  );
}
