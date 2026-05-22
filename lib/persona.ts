import type { SupabaseClient } from "@supabase/supabase-js";
import { getRandomGirlName } from "@/lib/girl-names";
import type { Database } from "@/lib/types";

export async function resolveAdminPersona(
  supabase: SupabaseClient<Database>,
  modelProvidedName?: string | null
): Promise<string> {
  if (modelProvidedName?.trim()) return modelProvidedName.trim();

  const { data } = await supabase
    .from("app_settings")
    .select("persona_mode, fixed_persona_name")
    .eq("id", "landing")
    .single();

  if (
    data?.persona_mode === "fixed" &&
    typeof data.fixed_persona_name === "string" &&
    data.fixed_persona_name.trim()
  ) {
    return data.fixed_persona_name.trim();
  }

  return getRandomGirlName();
}
