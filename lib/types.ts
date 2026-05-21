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
        };
        Insert: {
          id?: string;
          user_username: string;
          admin_username: string;
          created_at?: string;
          last_message?: string | null;
          last_message_at?: string;
          unread_count?: number;
        };
        Update: {
          id?: string;
          user_username?: string;
          admin_username?: string;
          created_at?: string;
          last_message?: string | null;
          last_message_at?: string;
          unread_count?: number;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          content: string | null;
          sender_type: "user" | "admin";
          file_url: string | null;
          file_type: "image" | "video" | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          content?: string | null;
          sender_type: "user" | "admin";
          file_url?: string | null;
          file_type?: "image" | "video" | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          content?: string | null;
          sender_type?: "user" | "admin";
          file_url?: string | null;
          file_type?: "image" | "video" | null;
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

export type Conversation =
  Database["public"]["Tables"]["conversations"]["Row"];
export type Message = Database["public"]["Tables"]["messages"]["Row"];
