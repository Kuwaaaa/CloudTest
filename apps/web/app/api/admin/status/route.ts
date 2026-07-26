import { execFile } from "child_process";
import { promisify } from "util";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";

const execFileAsync = promisify(execFile);

export async function GET(req: Request) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  try {
    const { stdout } = await execFileAsync("pm2", ["jlist"], { windowsHide: true });
    const list = JSON.parse(stdout) as Array<{ name?: string; pm2_env?: { status?: string; pm_uptime?: number } }>;
    const app = list.find((processInfo) => processInfo.name === "3DApp");

    return NextResponse.json({
      status: app?.pm2_env?.status ?? "offline",
      uptime: app?.pm2_env?.pm_uptime ?? 0,
    });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
