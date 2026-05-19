import "server-only";
import { NextResponse } from "next/server";
import type { ZodIssue } from "zod";

export function zodError(issues: ZodIssue[]): NextResponse {
  return NextResponse.json({ message: "Invalid payload", issues }, { status: 400 });
}

export function extractUpstreamMessage(text: string, status: number): string {
  try {
    const data = JSON.parse(text);
    if (data && typeof data === "object") {
      const d = data as Record<string, unknown>;
      if (typeof d.msg === "string" && d.msg) return d.msg;
      if (typeof d.message === "string" && d.message) return d.message;
      if (typeof d.error === "string" && d.error) return d.error;
    }
  } catch { /* non-JSON body */ }
  return text || `HTTP ${status}`;
}
