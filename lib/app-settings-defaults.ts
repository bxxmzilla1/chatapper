import type { AppSettings } from "@/lib/types";

export const DEFAULT_APP_SETTINGS: AppSettings = {
  id: "landing",
  background_video_url: null,
  overlay_opacity: 0.55,
  persona_mode: "random",
  fixed_persona_name: null,
  fixed_persona_avatar_url: null,
  chat_locked: false,
  lock_contact_name: "her",
  lock_button_url: null,
  lock_button_label: "Message on OnlyFans",
  updated_at: new Date().toISOString(),
};
