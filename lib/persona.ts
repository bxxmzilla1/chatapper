import type { SupabaseClient } from "@supabase/supabase-js";
import { getRandomGirlName } from "@/lib/girl-names";
import type { Database } from "@/lib/types";

export type NewConversationContext = {
  adminUsername: string;
  modelAvatarUrl: string | null;
};

export async function resolveNewConversationContext(
  supabase: SupabaseClient<Database>,
  opts: {
    modelProvidedName?: string | null;
    modelSlug?: string | null;
  }
): Promise<NewConversationContext> {
  if (opts.modelProvidedName?.trim()) {
    let modelAvatarUrl: string | null = null;
    if (opts.modelSlug) {
      const { data: model } = await supabase
        .from("model_profiles")
        .select("avatar_url")
        .eq("slug", opts.modelSlug)
        .single();
      modelAvatarUrl = model?.avatar_url ?? null;
    }
    return {
      adminUsername: opts.modelProvidedName.trim(),
      modelAvatarUrl,
    };
  }

  const { data: settings } = await supabase
    .from("app_settings")
    .select("persona_mode, fixed_persona_name, fixed_persona_avatar_url")
    .eq("id", "landing")
    .single();

  if (
    settings?.persona_mode === "fixed" &&
    typeof settings.fixed_persona_name === "string" &&
    settings.fixed_persona_name.trim()
  ) {
    const avatar =
      typeof settings.fixed_persona_avatar_url === "string" &&
      settings.fixed_persona_avatar_url.trim()
        ? settings.fixed_persona_avatar_url.trim()
        : null;
    return {
      adminUsername: settings.fixed_persona_name.trim(),
      modelAvatarUrl: avatar,
    };
  }

  return {
    adminUsername: getRandomGirlName(),
    modelAvatarUrl: null,
  };
}

/** @deprecated Use resolveNewConversationContext for new chats */
export async function resolveAdminPersona(
  supabase: SupabaseClient<Database>,
  modelProvidedName?: string | null
): Promise<string> {
  const ctx = await resolveNewConversationContext(supabase, {
    modelProvidedName,
  });
  return ctx.adminUsername;
}
