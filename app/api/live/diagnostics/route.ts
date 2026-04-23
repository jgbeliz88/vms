import { NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  url: z.string().url()
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const url = parsed.data.url;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      cache: "no-store"
    });

    const httpStatus = response.status;
    const bodyText = await response.text();

    if (httpStatus >= 400) {
      return NextResponse.json(
        {
          url,
          status: "error",
          httpStatus,
          error: `HTTP ${httpStatus}`
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      url,
      status: "ready",
      httpStatus,
      manifest: bodyText
    });
  } catch (error) {
    return NextResponse.json(
      {
        url,
        status: "error",
        error: error instanceof Error ? error.message : "Diagnostics failed"
      },
      { status: 200 }
    );
  }
}
