import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get("conversation_id");

  if (!conversationId) {
    return NextResponse.json(
      { error: "conversation_id is required" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { conversation_id, content, sender_type, file_url, file_type } = body;

  if (!conversation_id || !sender_type) {
    return NextResponse.json(
      { error: "conversation_id and sender_type are required" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  const { data: message, error } = await supabase
    .from("messages")
    .insert({ conversation_id, content, sender_type, file_url, file_type })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const lastMessage =
    file_type === "image"
      ? "📷 Image"
      : file_type === "video"
      ? "🎥 Video"
      : content;

  // Update conversation metadata
  if (sender_type === "user") {
    // Get current unread count and increment
    const { data: conv } = await supabase
      .from("conversations")
      .select("unread_count")
      .eq("id", conversation_id)
      .single();

    await supabase
      .from("conversations")
      .update({
        last_message: lastMessage,
        last_message_at: new Date().toISOString(),
        unread_count: (conv?.unread_count ?? 0) + 1,
      })
      .eq("id", conversation_id);
  } else {
    await supabase
      .from("conversations")
      .update({
        last_message: lastMessage,
        last_message_at: new Date().toISOString(),
      })
      .eq("id", conversation_id);
  }

  return NextResponse.json(message);
}
