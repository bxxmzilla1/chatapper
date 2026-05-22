import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getRandomGirlName } from "@/lib/girl-names";

export async function POST(req: NextRequest) {
  const { username, city, country, country_code, model_slug, admin_username } = await req.json();

  if (!username || typeof username !== "string" || username.trim() === "") {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }

  const supabase = createServerClient();
  // Use model's name when coming from a model page, otherwise random girl name
  const adminUsername = admin_username ?? getRandomGirlName();

  let modelAvatarUrl: string | null = null;
  if (model_slug) {
    const { data: model } = await supabase
      .from("model_profiles")
      .select("avatar_url")
      .eq("slug", model_slug)
      .single();
    modelAvatarUrl = model?.avatar_url ?? null;
  }

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      user_username: username.trim(),
      admin_username: adminUsername,
      user_city: city ?? null,
      user_country: country ?? null,
      user_country_code: country_code ?? null,
      model_slug: model_slug ?? null,
      model_avatar_url: modelAvatarUrl,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function GET() {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .order("last_message_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
