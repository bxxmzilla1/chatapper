import { NextRequest, NextResponse } from "next/server";
import { resolveUserIp } from "@/lib/resolve-user-ip";
import { lookupIpInfo } from "@/lib/ipinfo";

export async function GET(req: NextRequest) {
  const ip = await resolveUserIp(req);
  const info = await lookupIpInfo(ip ?? undefined);

  return NextResponse.json({
    ip: info.ip ?? ip ?? null,
    city: info.city,
    country: info.country,
    country_code: info.country_code,
    region: info.region,
  });
}
