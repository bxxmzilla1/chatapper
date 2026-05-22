import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { DEFAULT_APP_SETTINGS } from "@/lib/app-settings-defaults";

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
            "app_settings table missing. Run migrations in supabase/schema.sql in the Supabase SQL Editor.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ ...DEFAULT_APP_SETTINGS });
  }

  return NextResponse.json({
    ...DEFAULT_APP_SETTINGS,
    ...data,
    persona_mode: data.persona_mode === "fixed" ? "fixed" : "random",
    chat_locked: Boolean(data.chat_locked),
  });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

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

  if ("persona_mode" in body) {
    updates.persona_mode = body.persona_mode === "fixed" ? "fixed" : "random";
  }

  if ("fixed_persona_name" in body) {
    updates.fixed_persona_name =
      typeof body.fixed_persona_name === "string" &&
      body.fixed_persona_name.trim()
        ? body.fixed_persona_name.trim()
        : null;
  }

  if ("chat_locked" in body) {
    updates.chat_locked = Boolean(body.chat_locked);
  }

  if ("lock_contact_name" in body) {
    updates.lock_contact_name =
      typeof body.lock_contact_name === "string" &&
      body.lock_contact_name.trim()
        ? body.lock_contact_name.trim()
        : "her";
  }

  if ("lock_button_url" in body) {
    updates.lock_button_url =
      typeof body.lock_button_url === "string" && body.lock_button_url.trim()
        ? body.lock_button_url.trim()
        : null;
  }

  if ("lock_button_label" in body) {
    updates.lock_button_label =
      typeof body.lock_button_label === "string" &&
      body.lock_button_label.trim()
        ? body.lock_button_label.trim()
        : "Message on OnlyFans";
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
