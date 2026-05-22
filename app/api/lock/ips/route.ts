import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase.from("locked_ips").select("ip_address");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ips: (data ?? []).map((row) => row.ip_address),
  });
}
