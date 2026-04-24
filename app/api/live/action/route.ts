import { NextResponse } from "next/server";
import { z } from "zod";
import { getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";

const requestSchema = z.object({
  actionId: z.enum(["sync", "clean", "delete-flow"]),
  podName: z.string().min(1),
  podNode: z.string().optional(),
  linearName: z.string().optional(),
});

function buildTarget(
  actionId: string,
  podName: string,
  podNode: string,
  linearName: string
): { url: string; method: string } {
  const enigmaBase = getEnigmaBaseUrl();
  if (actionId === "sync") {
    return { url: `${enigmaBase}/live/synchronize/${podName}/${podNode}`, method: "GET" };
  }
  if (actionId === "clean") {
    return { url: `${enigmaBase}/live/clean/${podName}/${podNode}`, method: "GET" };
  }
  // delete-flow
  return { url: `${enigmaBase}/live/${podName}/${linearName}`, method: "DELETE" };
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const { actionId, podName, podNode, linearName } = parsed.data;
  const resolvedPodNode = podNode ?? podName;

  if (actionId === "delete-flow" && !linearName) {
    return NextResponse.json({ message: "linearName is required for delete-flow" }, { status: 400 });
  }

  const { url, method } = buildTarget(actionId, podName, resolvedPodNode, linearName!);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "*/*",
    "Accept-Encoding": "gzip, deflate, br"
  };
  const authHeader = request.headers.get("Authorization");
  if (authHeader) headers["Authorization"] = authHeader;

  try {
    const response = await fetchVMS(url, { method, headers });
    const text = await response.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!response.ok) {
      return NextResponse.json(
        { message: `Backend returned ${response.status}`, data },
        { status: response.status }
      );
    }

    return NextResponse.json({ status: response.status, data });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Request failed";
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
