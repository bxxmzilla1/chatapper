import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getRandomGirlName } from "@/lib/girl-names";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();

  // Get current conversation to avoid repeating the same name
  const { data: conv } = await supabase
    .from("conversations")
    .select("admin_username")
    .eq("id", id)
    .single();

  // Pick a new name that's different from the current one
  let newName = getRandomGirlName();
  let attempts = 0;
  while (newName === conv?.admin_username && attempts < 10) {
    newName = getRandomGirlName();
    attempts++;
  }

  // Update the conversation's admin persona
  const { error: updateError } = await supabase
    .from("conversations")
    .update({ admin_username: newName })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Insert a system checkpoint message visible to admin
  const { error: msgError } = await supabase.from("messages").insert({
    conversation_id: id,
    content: `SWITCH:${newName}`,
    sender_type: "system",
  });

  if (msgError) {
    return NextResponse.json({ error: msgError.message }, { status: 500 });
  }

  return NextResponse.json({ admin_username: newName });
}
