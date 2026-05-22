import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { resolveNewConversationContext } from "@/lib/persona";
import { isIpLocked } from "@/lib/ip-lock";
import { resolveUserIp } from "@/lib/resolve-user-ip";

export async function POST(req: NextRequest) {
  const { username, city, country, country_code, model_slug, admin_username } = await req.json();

  if (!username || typeof username !== "string" || username.trim() === "") {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { adminUsername, modelAvatarUrl } = await resolveNewConversationContext(
    supabase,
    {
      modelProvidedName: admin_username,
      modelSlug: model_slug ?? null,
    }
  );

  const userIp = await resolveUserIp(req);
  const ipLocked = await isIpLocked(supabase, userIp);

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
      user_ip: userIp,
      chat_locked: ipLocked,
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
