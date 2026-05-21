"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Message, Conversation } from "@/lib/types";
import {
  ArrowLeft,
  Send,
  Paperclip,
  Circle,
  Shuffle,
  Heart,
} from "lucide-react";

export default function ChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const username = searchParams.get("user") || "You";

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [convertPct, setConvertPct] = useState(0);
  const [switching, setSwitching] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  // Tracks all persona names the user has "matched" with in order
  const [matchHistory, setMatchHistory] = useState<string[]>([]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea up to ~5 lines, then scroll inside
  const MAX_TEXTAREA_HEIGHT = 140; // px ≈ 5–6 lines
  function resizeTextarea() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT) + "px";
  }

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Load conversation
  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/conversations/${conversationId}`);
      if (!res.ok) {
        router.push("/");
        return;
      }
      const data = await res.json();
      setConversation(data);
      setMatchHistory([data.admin_username]);
    }
    load();
  }, [conversationId, router]);

  // Load messages
  useEffect(() => {
    async function loadMessages() {
      const res = await fetch(
        `/api/messages?conversation_id=${conversationId}`
      );
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
      setTimeout(scrollToBottom, 100);
    }
    loadMessages();
  }, [conversationId, scrollToBottom]);

  // Real-time subscription for messages + conversation updates
  useEffect(() => {
    const msgChannel = supabase
      .channel(`conv:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          if (newMsg.sender_type === "admin") setIsTyping(false);
          setTimeout(scrollToBottom, 50);
        }
      )
      .subscribe();

    // Also subscribe to conversation updates (admin_username changes)
    const convChannel = supabase
      .channel(`conv-meta:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversations",
          filter: `id=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new as Conversation;
          setConversation(updated);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(convChannel);
    };
  }, [conversationId, scrollToBottom]);

  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    if (sending || uploading) return;
    setSending(true);
    // Clear + shrink immediately so the UI feels instant
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.focus();
    }

    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: conversationId,
          content: trimmed,
          sender_type: "user",
          file_url: null,
          file_type: null,
        }),
      });
    } catch {
      // silently handle
    } finally {
      setSending(false);
    }
  }

  async function handleSwitchMatch() {
    if (switching) return;
    setSwitching(true);

    try {
      const res = await fetch(
        `/api/conversations/${conversationId}/switch`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Switch failed");
      const data = await res.json();
      // Update local match history so the transition card shows immediately
      setMatchHistory((prev) => [...prev, data.admin_username]);
    } catch {
      // silently handle
    } finally {
      setSwitching(false);
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    let file = e.target.files?.[0];
    if (!file) return;
    if (fileRef.current) fileRef.current.value = "";
    if (sending || uploading || converting) return;

    try {
      // Convert non-MP4/WebM videos to MP4 before uploading
      const ext = (file.name.split(".").pop() ?? "").toLowerCase();
      const type = file.type.toLowerCase();
      const isVideo = type.startsWith("video/") || ["mov","avi","mkv","3gp","m4v","flv","wmv","ts"].includes(ext);
      const alreadyMp4 = type === "video/mp4" || ext === "mp4";
      const alreadyWebm = type === "video/webm" || ext === "webm";

      if (isVideo && !alreadyMp4 && !alreadyWebm) {
        setConverting(true);
        setConvertPct(0);
        const { ensureMp4 } = await import("@/lib/convert-video");
        file = await ensureMp4(file, (pct) => setConvertPct(pct));
        setConverting(false);
      }

      // Upload directly from browser → Supabase Storage (no Vercel timeout)
      setSending(true);
      setUploading(true);

      const finalExt = (file.name.split(".").pop() ?? "mp4").toLowerCase();
      const mimeType = file.type || (finalExt === "mp4" ? "video/mp4" : `video/${finalExt}`);
      const storagePath = `${conversationId}/${Date.now()}.${finalExt}`;

      const { error: storageError } = await supabase.storage
        .from("chat-media")
        .upload(storagePath, file, { contentType: mimeType, upsert: false });

      if (storageError) {
        console.error("Storage upload failed:", storageError.message);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("chat-media")
        .getPublicUrl(storagePath);

      const fileType = mimeType.startsWith("image/") ? "image" : "video";
      setUploading(false);

      const msgRes = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: conversationId,
          content: null,
          sender_type: "user",
          file_url: urlData.publicUrl,
          file_type: fileType,
        }),
      });
      if (!msgRes.ok) {
        console.error("Message save failed");
      }
    } catch (err) {
      console.error("File send error:", err);
      setConverting(false);
    } finally {
      setSending(false);
      setUploading(false);
    }
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Current active persona name (last in match history or from conversation)
  const currentPersona = conversation?.admin_username ?? matchHistory[matchHistory.length - 1] ?? "…";

  // Render messages — only show messages AFTER the last SWITCH (user only sees current session)
  function renderMessages() {
    const items: React.ReactNode[] = [];

    // Find the index of the last SWITCH system message
    let lastSwitchIdx = -1;
    messages.forEach((msg, i) => {
      if (msg.sender_type === "system" && msg.content?.startsWith("SWITCH:")) {
        lastSwitchIdx = i;
      }
    });

    // Only render from the last switch point (or from the beginning if no switch)
    const visibleMessages = lastSwitchIdx === -1
      ? messages
      : messages.slice(lastSwitchIdx); // includes the SWITCH message itself (rendered as match card)

    visibleMessages.forEach((msg, i) => {
      if (msg.sender_type === "system" && msg.content?.startsWith("SWITCH:")) {
        const newName = msg.content.replace("SWITCH:", "");
        items.push(
          <MatchSwitchCard key={msg.id} name={newName} time={msg.created_at} />
        );
        return;
      }

      const isUser = msg.sender_type === "user";
      const prevMsg = visibleMessages[i - 1];

      const showName =
        !isUser &&
        msg.sender_type === "admin" &&
        (i === 0 || prevMsg?.sender_type !== "admin");

      items.push(
        <div
          key={msg.id}
          className={`flex flex-col ${isUser ? "items-end" : "items-start"} animate-fade-up`}
        >
          {showName && (
            <p
              className="text-xs mb-1 px-1"
              style={{ color: "var(--text-muted)" }}
            >
              {currentPersona}
            </p>
          )}
          <div
            className={`max-w-[85%] rounded-2xl relative ${
              msg.file_url ? "p-1.5" : "px-4 py-2.5"
            } ${isUser ? "bubble-user rounded-br-sm" : "bubble-admin rounded-bl-sm"}`}
            style={{
              background: isUser ? "var(--bubble-user)" : "var(--bubble-admin)",
            }}
          >
            {msg.file_url && msg.file_type === "image" && (
              <img
                src={msg.file_url}
                alt="shared"
                className="rounded-xl block"
                style={{ width: "260px", maxWidth: "100%", height: "auto" }}
              />
            )}
            {msg.file_url && msg.file_type === "video" && (
              <video
                controls
                playsInline
                preload="auto"
                className="rounded-xl mb-1 block"
                style={{ width: "260px", maxWidth: "100%", height: "auto" }}
              >
                <source src={msg.file_url} type="video/mp4" />
                <source src={msg.file_url} type="video/quicktime" />
                <source src={msg.file_url} type="video/webm" />
              </video>
            )}
            {msg.content && (
              <p className="text-sm leading-relaxed text-white whitespace-pre-wrap px-2.5 pt-1">
                {msg.content}
              </p>
            )}
            <p
              className={`text-xs px-2.5 pb-1 pt-0.5 ${msg.file_url && !msg.content ? "text-right" : isUser ? "text-right" : "text-left"}`}
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              {formatTime(msg.created_at)}
            </p>
          </div>
        </div>
      );
    });

    return items;
  }

  return (
    <div className="page-shell" style={{ background: "var(--bg)" }}>

      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 z-10"
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <button
          onClick={() => router.push("/")}
          className="p-2 rounded-xl transition hover:opacity-70"
          style={{ background: "var(--surface2)" }}
        >
          <ArrowLeft className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
        </button>

        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 relative"
          style={{ background: "var(--accent)" }}
        >
          {currentPersona[0]}
          <span
            className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
            style={{ background: "#22c55e", borderColor: "var(--surface)" }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white truncate">{currentPersona}</p>
          <p className="text-xs flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
            {isTyping ? (
              <>
                <Circle className="w-2 h-2 fill-green-400 text-green-400" />
                typing…
              </>
            ) : (
              "Online"
            )}
          </p>
        </div>

        {/* New Match button */}
        <button
          onClick={handleSwitchMatch}
          disabled={switching}
          title="Find a new match"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition active:scale-95 disabled:opacity-50"
          style={{ background: "var(--surface2)", color: "var(--accent-light)" }}
        >
          <Shuffle className={`w-4 h-4 ${switching ? "animate-spin" : ""}`} />
          {switching ? "Matching…" : "New Match"}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center gap-2 py-12">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
              style={{ background: "var(--surface2)" }}
            >
              {currentPersona[0]}
            </div>
            <p className="font-semibold text-white">{currentPersona}</p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {conversation?.user_city
                ? `Nearby in ${conversation.user_city} · Say hi 👋`
                : "Nearby · Say hi 👋"}
            </p>
          </div>
        )}

        {renderMessages()}

        {isTyping && (
          <div className="flex items-start gap-2 animate-fade-up">
            <div
              className="px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1 items-center"
              style={{ background: "var(--bubble-admin)" }}
            >
              <span className="typing-dot w-2 h-2 rounded-full bg-gray-400 inline-block" />
              <span className="typing-dot w-2 h-2 rounded-full bg-gray-400 inline-block" />
              <span className="typing-dot w-2 h-2 rounded-full bg-gray-400 inline-block" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Converting / uploading indicator */}
      {(converting || uploading) && (
        <div
          className="px-4 py-2 flex items-center gap-2"
          style={{
            background: "var(--surface)",
            borderTop: "1px solid var(--border)",
          }}
        >
          <div className="w-4 h-4 rounded-full border-2 border-purple-500 border-t-transparent animate-spin flex-shrink-0" />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {converting
              ? convertPct > 0
                ? `Converting video… ${convertPct}%`
                : "Preparing converter…"
              : "Uploading…"}
          </p>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={sendMessage}
        className="px-4 pt-3 pb-3 safe-bottom-padding flex items-end gap-2"
        style={{
          background: "var(--surface)",
          borderTop: "1px solid var(--border)",
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/mp4,video/webm,video/quicktime"
          className="hidden"
          onChange={handleFileSelect}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="p-2.5 rounded-xl flex-shrink-0 transition hover:opacity-70"
          style={{ background: "var(--surface2)" }}
        >
          <Paperclip className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
        </button>

        <div
          className="flex-1 flex items-end rounded-2xl px-4 py-2.5"
          style={{
            background: "var(--surface2)",
            border: "1px solid var(--border)",
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              resizeTextarea();
            }}
            placeholder="Message…"
            rows={1}
            className="flex-1 resize-none bg-transparent outline-none text-sm text-white placeholder-gray-500 leading-relaxed overflow-y-auto w-full"
            style={{
              color: "var(--text)",
              minHeight: "24px",
              maxHeight: `${MAX_TEXTAREA_HEIGHT}px`,
            }}
          />
        </div>

        <button
          type="submit"
          disabled={sending || uploading || !input.trim()}
          className="p-3 rounded-xl flex-shrink-0 transition active:scale-95 disabled:opacity-40"
          style={{ background: "var(--accent)" }}
        >
          <Send className="w-5 h-5 text-white" />
        </button>
      </form>
    </div>
  );
}

// ─── Match Switch Card (user-visible) ────────────────────────────────────────
function MatchSwitchCard({ name, time }: { name: string; time: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-4 animate-fade-up">
      <div className="flex items-center gap-3 w-full">
        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-medium"
          style={{
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            color: "var(--text-muted)",
          }}
        >
          <Heart className="w-3.5 h-3.5 text-pink-400 fill-pink-400" />
          New match found
        </div>
        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
      </div>
      <div
        className="flex flex-col items-center gap-1.5 px-6 py-4 rounded-2xl"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white"
          style={{ background: "var(--accent)" }}
        >
          {name[0]}
        </div>
        <p className="font-semibold text-white text-sm">{name}</p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          nearby match · {new Date(time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
        <div className="flex items-center gap-1 mt-1">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-xs text-green-400">Online · Nearby</span>
        </div>
      </div>
    </div>
  );
}
