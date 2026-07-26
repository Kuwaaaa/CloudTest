import { execFile } from "child_process";
import { promisify } from "util";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";

const execFileAsync = promisify(execFile);

export async function POST(req: Request) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  if (process.env.NODE_ENV === "test" && process.env.CLOUDTEST_ALLOW_PM2_RESTART !== "1") {
    return NextResponse.json({ error: "PM2 restart is disabled in test environment" }, { status: 403 });
  }

  try {
    const { stdout, stderr } = await execFileAsync("pm2", ["restart", "3DApp"], {
      windowsHide: true,
    });

    return NextResponse.json({ success: true, stdout, stderr });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Restart failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
