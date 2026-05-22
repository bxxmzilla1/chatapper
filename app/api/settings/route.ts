import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

const SETTINGS_ID = "landing";

export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("app_settings")
    .select("*")
    .eq("id", SETTINGS_ID)
    .single();

  if (error) {
    if (error.code === "PGRST205" || error.message.includes("app_settings")) {
      return NextResponse.json(
        {
          error:
            "app_settings table missing. Run Migration 5 in supabase/schema.sql in the Supabase SQL Editor.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({
      id: SETTINGS_ID,
      background_video_url: null,
      overlay_opacity: 0.55,
    });
  }

  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const updates: {
    background_video_url?: string | null;
    overlay_opacity?: number;
    updated_at: string;
  } = { updated_at: new Date().toISOString() };

  if ("background_video_url" in body) {
    updates.background_video_url =
      typeof body.background_video_url === "string"
        ? body.background_video_url
        : null;
  }

  if ("overlay_opacity" in body) {
    const n = Number(body.overlay_opacity);
    updates.overlay_opacity = Number.isFinite(n)
      ? Math.min(1, Math.max(0, n))
      : 0.55;
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("app_settings")
    .upsert({ id: SETTINGS_ID, ...updates }, { onConflict: "id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
