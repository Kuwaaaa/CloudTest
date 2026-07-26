import { NextResponse } from "next/server";

const SAFE_LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

const getHostName = (host: string | null) => {
  if (!host) return "";
  return host.split(":")[0]?.toLowerCase() ?? "";
};

const isLocalRequest = (req: Request) => {
  const host = getHostName(req.headers.get("host"));
  const forwardedHost = getHostName(req.headers.get("x-forwarded-host"));
  const effectiveHost = forwardedHost || host;

  return SAFE_LOCAL_HOSTS.has(effectiveHost);
};

export const isAdminRequest = (req: Request) => {
  const adminToken = process.env.CLOUDTEST_ADMIN_TOKEN?.trim();

  if (!adminToken) {
    return isLocalRequest(req);
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const tokenHeader = req.headers.get("x-admin-token") ?? "";

  return authHeader === `Bearer ${adminToken}` || tokenHeader === adminToken;
};

export const requireAdmin = (req: Request) => {
  if (isAdminRequest(req)) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
};
