import "server-only";
import { NextResponse } from "next/server";
import type { ZodIssue } from "zod";

export function zodError(issues: ZodIssue[]): NextResponse {
  return NextResponse.json({ message: "Invalid payload", issues }, { status: 400 });
}
