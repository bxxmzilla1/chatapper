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
      ...("lock_popup_custom" in body
        ? { lock_popup_custom: Boolean(body.lock_popup_custom) }
        : {}),
      ...("lock_message" in body
        ? {
            lock_message:
              typeof body.lock_message === "string" && body.lock_message.trim()
                ? body.lock_message.trim()
                : null,
          }
        : {}),
      ...("lock_button_url" in body
        ? {
            lock_button_url:
              typeof body.lock_button_url === "string" && body.lock_button_url.trim()
                ? body.lock_button_url.trim()
                : null,
          }
        : {}),
      ...("lock_button_label" in body
        ? {
            lock_button_label:
              typeof body.lock_button_label === "string" &&
              body.lock_button_label.trim()
                ? body.lock_button_label.trim()
                : "Message on OnlyFans",
          }
        : {}),
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
