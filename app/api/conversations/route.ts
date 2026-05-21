import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getRandomGirlName } from "@/lib/girl-names";

export async function POST(req: NextRequest) {
  const { username, city, country, country_code } = await req.json();

  if (!username || typeof username !== "string" || username.trim() === "") {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }

  const supabase = createServerClient();
  const adminUsername = getRandomGirlName();

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      user_username: username.trim(),
      admin_username: adminUsername,
      user_city: city ?? null,
      user_country: country ?? null,
      user_country_code: country_code ?? null,
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
