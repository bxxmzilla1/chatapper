import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { resolveUserIp } from "@/lib/resolve-user-ip";

/** Record visitor IP on the conversation (for IP-based lock). */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ip = await resolveUserIp(req);
  if (!ip) {
    return NextResponse.json({ ok: true, ip: null });
  }

  const supabase = createServerClient();
  const { data: conv } = await supabase
    .from("conversations")
    .select("user_ip")
    .eq("id", id)
    .single();

  if (!conv) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!conv.user_ip) {
    await supabase.from("conversations").update({ user_ip: ip }).eq("id", id);
  }

  return NextResponse.json({ ok: true, ip });
}
