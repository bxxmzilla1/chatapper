import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("model_profiles")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await req.json();
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("model_profiles")
    .update({
      ...("slug" in body ? { slug: body.slug as string } : {}),
      ...("redirect_url" in body ? { redirect_url: (body.redirect_url as string | null) ?? null } : {}),
      ...("name" in body ? { name: body.name as string } : {}),
      ...("subtitle" in body ? { subtitle: body.subtitle as string } : {}),
      ...("avatar_url" in body ? { avatar_url: (body.avatar_url as string | null) ?? null } : {}),
    })
    .eq("slug", slug)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createServerClient();

  const { error } = await supabase
    .from("model_profiles")
    .delete()
    .eq("slug", slug);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
