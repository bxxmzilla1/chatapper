import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

const RESERVED = new Set(["admin", "chat", "api", "_next", "icons", "favicon.ico", "manifest.json", "sw.js"]);

export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("model_profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const {
    slug,
    name,
    avatar_url,
    subtitle,
    lock_popup_custom,
    lock_message,
    lock_button_url,
    lock_button_label,
  } = await req.json();

  if (!slug || !name) {
    return NextResponse.json({ error: "slug and name are required" }, { status: 400 });
  }

  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

  if (RESERVED.has(cleanSlug)) {
    return NextResponse.json({ error: "That URL is reserved" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("model_profiles")
    .insert({
      slug: cleanSlug,
      name,
      avatar_url: avatar_url ?? null,
      subtitle: subtitle ?? "Meet people near you",
      lock_popup_custom: Boolean(lock_popup_custom),
      lock_message:
        typeof lock_message === "string" && lock_message.trim()
          ? lock_message.trim()
          : null,
      lock_button_url:
        typeof lock_button_url === "string" && lock_button_url.trim()
          ? lock_button_url.trim()
          : null,
      lock_button_label:
        typeof lock_button_label === "string" && lock_button_label.trim()
          ? lock_button_label.trim()
          : "Message on OnlyFans",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
