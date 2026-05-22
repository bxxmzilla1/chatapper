import type { NextRequest } from "next/server";

export function isLocalIp(ip: string): boolean {
  if (!ip) return true;
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    ip.startsWith("172.16.") ||
    ip === "unknown"
  );
}

/** Client IP from Vercel/proxy headers. */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0]?.trim() || realIp?.trim() || "";
  return ip;
}
