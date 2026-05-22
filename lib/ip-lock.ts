import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

export async function isIpLocked(
  supabase: SupabaseClient<Database>,
  ip: string | null | undefined
): Promise<boolean> {
  if (!ip) return false;
  const { data } = await supabase
    .from("locked_ips")
    .select("ip_address")
    .eq("ip_address", ip)
    .maybeSingle();
  return Boolean(data);
}

export async function setConversationLock(
  supabase: SupabaseClient<Database>,
  conversationId: string,
  locked: boolean
): Promise<void> {
  const { data: conv } = await supabase
    .from("conversations")
    .select("user_ip")
    .eq("id", conversationId)
    .single();

  const userIp = conv?.user_ip ?? null;

  if (locked) {
    await supabase
      .from("conversations")
      .update({ chat_locked: true })
      .eq("id", conversationId);

    if (userIp) {
      await supabase.from("locked_ips").upsert(
        {
          ip_address: userIp,
          source_conversation_id: conversationId,
          locked_at: new Date().toISOString(),
        },
        { onConflict: "ip_address" }
      );
      await supabase
        .from("conversations")
        .update({ chat_locked: true })
        .eq("user_ip", userIp);
    }
    return;
  }

  if (userIp) {
    await supabase.from("locked_ips").delete().eq("ip_address", userIp);
    await supabase
      .from("conversations")
      .update({ chat_locked: false })
      .eq("user_ip", userIp);
  }

  await supabase
    .from("conversations")
    .update({ chat_locked: false })
    .eq("id", conversationId);
}
