import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { isIpLocked } from "@/lib/ip-lock";
import { resolveUserIp } from "@/lib/resolve-user-ip";

export async function GET(req: NextRequest) {
  const ip = await resolveUserIp(req);
  const supabase = createServerClient();
  const locked = await isIpLocked(supabase, ip);

  return NextResponse.json({ locked, ip: ip ?? null });
}
