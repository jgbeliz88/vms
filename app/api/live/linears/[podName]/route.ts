import { NextResponse } from "next/server";
import { getEnigmaBaseUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ podName: string }> }
) {
  const { podName } = await params;
  const enigmaBase = getEnigmaBaseUrl();
  const url = `${enigmaBase}/live/linears/${podName}`;

  const headers: Record<string, string> = { Accept: "*/*" };
  const authHeader = request.headers.get("Authorization");
  if (authHeader) headers["Authorization"] = authHeader;

  try {
    const response = await fetchVMS(url, { method: "DELETE", headers });
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
