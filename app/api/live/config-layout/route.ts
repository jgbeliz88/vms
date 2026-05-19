import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { logInfo, logError } from "@/app/api/_lib/logger";

const LOG_NAME = "app.api.live.config-layout.route";

const layoutPath = path.join(process.cwd(), "data", "configLayout.json");

export async function GET() {
  let raw: string;
  try {
    raw = await fs.readFile(layoutPath, "utf8");
  } catch (err) {
    logError({ name: LOG_NAME, fn: "GET", msg: `Failed to read config layout file path=${layoutPath}`, error: err });
    return NextResponse.json({ message: "Failed to read config layout" }, { status: 500 });
  }
  const data = JSON.parse(raw);
  logInfo({ name: LOG_NAME, fn: "GET", msg: "End of request", data });
  return NextResponse.json(data);
}
