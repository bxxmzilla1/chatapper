import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = process.env.IPINFO_TOKEN;

  // Get the real client IP from Vercel/proxy headers
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0]?.trim() || realIp || "";

  // Skip loopback / private IPs during local dev — use no-IP lookup (returns server location)
  const isLocal =
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    ip === "";

  const url = isLocal
    ? `https://api.ipinfo.io/lookup?token=${token}`
    : `https://api.ipinfo.io/lookup/${ip}?token=${token}`;

  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error("IPinfo error");
    const data = await res.json();

    return NextResponse.json({
      city: data.geo?.city ?? null,
      country: data.geo?.country ?? null,
      country_code: data.geo?.country_code ?? null,
      region: data.geo?.region ?? null,
      postal_code: data.geo?.postal_code ?? null,
    });
  } catch {
    return NextResponse.json({ city: null, country: null, country_code: null, region: null, postal_code: null });
  }
}
