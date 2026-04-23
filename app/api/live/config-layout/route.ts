import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const layoutPath = path.join(process.cwd(), "data", "configLayout.json");

export async function GET() {
  const raw = await fs.readFile(layoutPath, "utf8");
  return NextResponse.json(JSON.parse(raw));
}
