import { isLocalIp } from "@/lib/client-ip";

export type IpInfoLookup = {
  ip: string | null;
  city: string | null;
  country: string | null;
  country_code: string | null;
  region: string | null;
};

/** Resolve visitor IP and geo via IPinfo (used when proxy headers are missing). */
export async function lookupIpInfo(ip?: string): Promise<IpInfoLookup> {
  const token = process.env.IPINFO_TOKEN;
  if (!token) {
    return {
      ip: ip && !isLocalIp(ip) ? ip : null,
      city: null,
      country: null,
      country_code: null,
      region: null,
    };
  }

  const useIp = ip && !isLocalIp(ip) ? ip : null;
  const url = useIp
    ? `https://api.ipinfo.io/lookup/${encodeURIComponent(useIp)}?token=${token}`
    : `https://api.ipinfo.io/lookup?token=${token}`;

  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error("IPinfo error");
    const data = await res.json();

    return {
      ip: data.ip ?? useIp ?? null,
      city: data.geo?.city ?? null,
      country: data.geo?.country ?? null,
      country_code: data.geo?.country_code ?? null,
      region: data.geo?.region ?? null,
    };
  } catch {
    return {
      ip: useIp ?? null,
      city: null,
      country: null,
      country_code: null,
      region: null,
    };
  }
}
