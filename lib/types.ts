export type Database = {
  public: {
    Tables: {
      conversations: {
        Row: {
          id: string;
          user_username: string;
          admin_username: string;
          created_at: string;
          last_message: string | null;
          last_message_at: string;
          unread_count: number;
          user_city: string | null;
          user_country: string | null;
          user_country_code: string | null;
          model_slug: string | null;
          model_avatar_url: string | null;
          chat_locked: boolean;
          user_ip: string | null;
        };
        Insert: {
          id?: string;
          user_username: string;
          admin_username: string;
          created_at?: string;
          last_message?: string | null;
          last_message_at?: string;
          unread_count?: number;
          user_city?: string | null;
          user_country?: string | null;
          user_country_code?: string | null;
          model_slug?: string | null;
          model_avatar_url?: string | null;
          chat_locked?: boolean;
          user_ip?: string | null;
        };
        Update: {
          id?: string;
          user_username?: string;
          admin_username?: string;
          created_at?: string;
          last_message?: string | null;
          last_message_at?: string;
          unread_count?: number;
          user_city?: string | null;
          user_country?: string | null;
          user_country_code?: string | null;
          model_slug?: string | null;
          model_avatar_url?: string | null;
          chat_locked?: boolean;
          user_ip?: string | null;
        };
        Relationships: [];
      };
      locked_ips: {
        Row: {
          ip_address: string;
          locked_at: string;
          source_conversation_id: string | null;
        };
        Insert: {
          ip_address: string;
          locked_at?: string;
          source_conversation_id?: string | null;
        };
        Update: {
          ip_address?: string;
          locked_at?: string;
          source_conversation_id?: string | null;
        };
        Relationships: [];
      };
      app_settings: {
        Row: {
          id: string;
          background_video_url: string | null;
          overlay_opacity: number;
          persona_mode: "random" | "fixed";
          fixed_persona_name: string | null;
          fixed_persona_avatar_url: string | null;
          chat_locked: boolean;
          lock_contact_name: string | null;
          lock_button_url: string | null;
          lock_button_label: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          background_video_url?: string | null;
          overlay_opacity?: number;
          persona_mode?: "random" | "fixed";
          fixed_persona_name?: string | null;
          fixed_persona_avatar_url?: string | null;
          chat_locked?: boolean;
          lock_contact_name?: string | null;
          lock_button_url?: string | null;
          lock_button_label?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          background_video_url?: string | null;
          overlay_opacity?: number;
          persona_mode?: "random" | "fixed";
          fixed_persona_name?: string | null;
          fixed_persona_avatar_url?: string | null;
          chat_locked?: boolean;
          lock_contact_name?: string | null;
          lock_button_url?: string | null;
          lock_button_label?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      model_profiles: {
        Row: {
          id: string;
          slug: string;
          name: string;
          avatar_url: string | null;
          subtitle: string;
          redirect_url: string | null;
          lock_popup_custom: boolean;
          lock_message: string | null;
          lock_button_url: string | null;
          lock_button_label: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          avatar_url?: string | null;
          subtitle?: string;
          redirect_url?: string | null;
          lock_popup_custom?: boolean;
          lock_message?: string | null;
          lock_button_url?: string | null;
          lock_button_label?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          avatar_url?: string | null;
          subtitle?: string;
          redirect_url?: string | null;
          lock_popup_custom?: boolean;
          lock_message?: string | null;
          lock_button_url?: string | null;
          lock_button_label?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          content: string | null;
          sender_type: "user" | "admin" | "system";
          file_url: string | null;
          file_type: "image" | "video" | null;
          moderation_hidden: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          content?: string | null;
          sender_type: "user" | "admin" | "system";
          file_url?: string | null;
          file_type?: "image" | "video" | null;
          moderation_hidden?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          content?: string | null;
          sender_type?: "user" | "admin" | "system";
          file_url?: string | null;
          file_type?: "image" | "video" | null;
          moderation_hidden?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Conversation = Database["public"]["Tables"]["conversations"]["Row"];
export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type ModelProfile = Database["public"]["Tables"]["model_profiles"]["Row"];
export type AppSettings = Database["public"]["Tables"]["app_settings"]["Row"];
