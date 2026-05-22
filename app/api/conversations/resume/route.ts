import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { findLatestConversationForIp, isIpLocked } from "@/lib/ip-lock";
import { resolveUserIp } from "@/lib/resolve-user-ip";

/** If this visitor is IP-locked, return their existing chat to resume. */
export async function GET(req: NextRequest) {
  const ip = await resolveUserIp(req);
  const supabase = createServerClient();
  const locked = await isIpLocked(supabase, ip);

  if (!locked) {
    return NextResponse.json({ locked: false, conversation: null });
  }

  const conversation = await findLatestConversationForIp(supabase, ip);

  return NextResponse.json({
    locked: true,
    conversation,
  });
}
