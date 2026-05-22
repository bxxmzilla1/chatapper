import type { NextRequest } from "next/server";
import { getClientIp, isLocalIp } from "@/lib/client-ip";
import { lookupIpInfo } from "@/lib/ipinfo";

/** Prefer proxy headers; fall back to IPinfo lookup for the visitor. */
export async function resolveUserIp(req: NextRequest): Promise<string | null> {
  const headerIp = getClientIp(req);
  if (headerIp && !isLocalIp(headerIp)) return headerIp;

  const info = await lookupIpInfo(headerIp || undefined);
  if (info.ip && !isLocalIp(info.ip)) return info.ip;

  return headerIp || null;
}
