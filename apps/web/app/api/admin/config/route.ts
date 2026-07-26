import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { readRuntimeConfig, writeRuntimeConfig } from "@/lib/runtime-config";

export async function GET(req: Request) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  try {
    return NextResponse.json(readRuntimeConfig());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to read config";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  try {
    const body = await req.json();
    const config = writeRuntimeConfig(body);

    return NextResponse.json({ success: true, config });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to write config";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
