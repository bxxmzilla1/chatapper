"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Message, Conversation } from "@/lib/types";
import { linkifyText } from "@/lib/linkify";
import {
  MODERATION_NOTICE,
  moderationBubbleStyle,
  moderationTextClass,
} from "@/lib/message-moderation";
import { ModelAvatar } from "@/components/ModelAvatar";
import { ChatLockModal } from "@/components/ChatLockModal";
import {
  Send,
  Paperclip,
  Circle,
  Heart,
} from "lucide-react";

function VerifiedBadge({ size = 16 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ color: "var(--accent-light)", flexShrink: 0 }}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M12.01 2.011a3.2 3.2 0 0 1 2.113 .797l.154 .145l.698 .698a1.2 1.2 0 0 0 .71 .341l.135 .008h1a3.2 3.2 0 0 1 3.195 3.018l.005 .182v1c0 .27 .092 .533 .258 .743l.09 .1l.697 .698a3.2 3.2 0 0 1 .147 4.382l-.145 .154l-.698 .698a1.2 1.2 0 0 0 -.341 .71l-.008 .135v1a3.2 3.2 0 0 1 -3.018 3.195l-.182 .005h-1a1.2 1.2 0 0 0 -.743 .258l-.1 .09l-.698 .697a3.2 3.2 0 0 1 -4.382 .147l-.154 -.145l-.698 -.698a1.2 1.2 0 0 0 -.71 -.341l-.135 -.008h-1a3.2 3.2 0 0 1 -3.195 -3.018l-.005 -.182v-1a1.2 1.2 0 0 0 -.258 -.743l-.09 -.1l-.697 -.698a3.2 3.2 0 0 1 -.147 -4.382l.145 -.154l.698 -.698a1.2 1.2 0 0 0 .341 -.71l.008 -.135v-1l.005 -.182a3.2 3.2 0 0 1 3.013 -3.013l.182 -.005h1a1.2 1.2 0 0 0 .743 -.258l.1 -.09l.698 -.697a3.2 3.2 0 0 1 2.269 -.944zm3.697 7.282a1 1 0 0 0 -1.414 0l-3.293 3.292l-1.293 -1.292l-.094 -.083a1 1 0 0 0 -1.32 1.497l2 2l.094 .083a1 1 0 0 0 1.32 -.083l4 -4l.083 -.094a1 1 0 0 0 -.083 -1.32z" />
    </svg>
  );
}

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
  const [isTyping, setIsTyping] = useState(false);
  const [chatLocked, setChatLocked] = useState(false);
  const [lockVariant, setLockVariant] = useState<"global" | "landing">("global");
  const [lockContactName, setLockContactName] = useState("her");
  const [lockMessage, setLockMessage] = useState<string | null>(null);
  const [lockButtonUrl, setLockButtonUrl] = useState<string | null>(null);
  const [lockButtonLabel, setLockButtonLabel] = useState("Message on OnlyFans");
  const [modelAvatarUrl, setModelAvatarUrl] = useState<string | null>(null);
  const [isModelPersona, setIsModelPersona] = useState(false);
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

  const syncChatLockState = useCallback(async (convLocked?: boolean) => {
    try {
      const statusRes = await fetch("/api/lock/status");
      const status = statusRes.ok ? await statusRes.json() : { locked: false };
      setChatLocked(Boolean(convLocked) || Boolean(status.locked));
    } catch {
      setChatLocked(Boolean(convLocked));
    }
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

      await fetch(`/api/conversations/${conversationId}/ip`, {
        method: "POST",
      }).catch(() => {});

      await syncChatLockState(Boolean(data.chat_locked));
      if (data.model_avatar_url) {
        setModelAvatarUrl(data.model_avatar_url);
      }

      async function applyLockPopupForConversation(conv: Conversation) {
        if (conv.model_slug) {
          try {
            const modelRes = await fetch(`/api/models/${conv.model_slug}`);
            if (modelRes.ok) {
              const model = await modelRes.json();
              if (model.avatar_url) setModelAvatarUrl(model.avatar_url);
              if (model.lock_popup_custom) {
                setIsModelPersona(true);
                setLockVariant("landing");
                setLockMessage(model.lock_message ?? null);
                setLockButtonUrl(model.lock_button_url ?? null);
                setLockButtonLabel(
                  model.lock_button_label?.trim() || "Message on OnlyFans"
                );
                return;
              }
            }
          } catch {
            /* fall through to global */
          }
        }

        setLockVariant("global");
        setLockMessage(null);
        try {
          const settingsRes = await fetch("/api/settings");
          const settings = await settingsRes.json();
          if (settings && !settings.error) {
            setLockContactName(settings.lock_contact_name?.trim() || "her");
            setLockButtonUrl(settings.lock_button_url ?? null);
            setLockButtonLabel(
              settings.lock_button_label?.trim() || "Message on OnlyFans"
            );
          }
        } catch {
          /* keep defaults */
        }
      }

      if (data.model_slug) {
        setIsModelPersona(true);
      }
      await applyLockPopupForConversation(data);
    }
    load();
  }, [conversationId, router, syncChatLockState]);

  useEffect(() => {
    const settingsChannel = supabase
      .channel("app-settings-lock-popup")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "app_settings",
          filter: "id=eq.landing",
        },
        (payload) => {
          if (lockVariant !== "global") return;
          const row = payload.new as {
            lock_contact_name?: string | null;
            lock_button_url?: string | null;
            lock_button_label?: string | null;
          };
          setLockContactName(row.lock_contact_name?.trim() || "her");
          setLockButtonUrl(row.lock_button_url ?? null);
          setLockButtonLabel(
            row.lock_button_label?.trim() || "Message on OnlyFans"
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(settingsChannel);
    };
  }, [lockVariant]);

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
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? updated : m))
          );
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
          syncChatLockState(Boolean(updated.chat_locked));
        }
      )
      .subscribe();

    const lockIpChannel = supabase
      .channel("locked-ips-user")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "locked_ips" },
        () => {
          syncChatLockState();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(convChannel);
      supabase.removeChannel(lockIpChannel);
    };
  }, [conversationId, scrollToBottom, syncChatLockState]);

  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault();
    if (chatLocked) return;
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

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (chatLocked) return;
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
        // Brief pause so the browser can GC WASM memory before the upload starts
        await new Promise(r => setTimeout(r, 300));
      }

      // Upload directly from browser → Supabase Storage (no Vercel timeout)
      setSending(true);
      setUploading(true);

      const finalExt = (file.name.split(".").pop() ?? "mp4").toLowerCase();
      const mimeType = file.type || (finalExt === "mp4" ? "video/mp4" : `video/${finalExt}`);
      const storagePath = `${conversationId}/${Date.now()}.${finalExt}`;

      // Retry up to 3 times in case of transient network errors
      let storageError = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        const result = await supabase.storage
          .from("chat-media")
          .upload(storagePath, file, { contentType: mimeType, upsert: attempt > 1 });
        if (!result.error) { storageError = null; break; }
        storageError = result.error;
        if (attempt < 3) await new Promise(r => setTimeout(r, 1000 * attempt));
      }

      if (storageError) {
        console.error("Storage upload failed after retries:", storageError.message);
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
      const hidden = Boolean(msg.moderation_hidden);

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
            style={moderationBubbleStyle(hidden, isUser)}
          >
            {msg.file_url && msg.file_type === "image" && (
              <img
                src={msg.file_url}
                alt="shared"
                className="media-bubble rounded-xl"
              />
            )}
            {msg.file_url && msg.file_type === "video" && (
              <VideoMessage src={msg.file_url} onReady={scrollToBottom} />
            )}
            {msg.content && (
              <p
                className={`text-sm leading-relaxed whitespace-pre-wrap px-2.5 pt-1 ${moderationTextClass(hidden, isUser)}`}
              >
                {linkifyText(msg.content, isUser && !hidden)}
              </p>
            )}
            <p
              className={`text-xs px-2.5 pb-1 pt-0.5 ${msg.file_url && !msg.content ? "text-right" : isUser ? "text-right" : "text-left"}`}
              style={{
                color: hidden
                  ? "rgba(254, 202, 202, 0.75)"
                  : isUser
                    ? "rgba(0,0,0,0.5)"
                    : "rgba(255,255,255,0.55)",
              }}
            >
              {formatTime(msg.created_at)}
            </p>
          </div>
          {hidden && (
            <p
              className={`text-xs mt-1.5 px-1 max-w-[85%] ${
                isUser ? "text-right" : "text-left"
              }`}
              style={{ color: "#f87171" }}
            >
              {MODERATION_NOTICE}
            </p>
          )}
        </div>
      );
    });

    return items;
  }

  return (
    <div className="page-shell relative" style={{ background: "var(--bg)" }}>
      {chatLocked && (
        <ChatLockModal
          variant={lockVariant}
          contactName={lockContactName}
          lockMessage={lockMessage}
          personaName={currentPersona}
          avatarUrl={modelAvatarUrl}
          buttonUrl={lockButtonUrl}
          buttonLabel={lockButtonLabel}
        />
      )}

      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 z-10"
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <ModelAvatar
            url={modelAvatarUrl}
            name={currentPersona}
            className="w-10 h-10 rounded-full object-cover text-sm"
          />
          <span
            className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
            style={{ background: "#22c55e", borderColor: "var(--surface)" }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="font-semibold text-white truncate">{currentPersona}</p>
            {isModelPersona && <VerifiedBadge size={16} />}
          </div>
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

      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center gap-2 py-12">
            <ModelAvatar
              url={modelAvatarUrl}
              name={currentPersona}
              className="w-16 h-16 rounded-full object-cover text-2xl"
            />
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-white">{currentPersona}</p>
              {isModelPersona && <VerifiedBadge size={16} />}
            </div>
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
          disabled={chatLocked}
          className="p-2.5 rounded-xl flex-shrink-0 transition hover:opacity-70 disabled:opacity-40"
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
            placeholder={chatLocked ? "Messaging locked" : "Message…"}
            rows={1}
            disabled={chatLocked}
            className="flex-1 resize-none bg-transparent outline-none text-sm text-white placeholder-gray-500 leading-relaxed overflow-y-auto w-full disabled:opacity-50"
            style={{
              color: "var(--text)",
              minHeight: "24px",
              maxHeight: `${MAX_TEXTAREA_HEIGHT}px`,
            }}
          />
        </div>

        <button
          type="submit"
          disabled={chatLocked || sending || uploading || !input.trim()}
          className="p-3 rounded-xl flex-shrink-0 transition active:scale-95 disabled:opacity-40"
          style={{ background: "var(--accent)" }}
        >
          <Send className="w-5 h-5 text-black" />
        </button>
      </form>
    </div>
  );
}

// ─── Video Message — captures first frame as poster so iOS shows a thumbnail ──
function VideoMessage({ src, onReady }: { src: string; onReady?: () => void }) {
  const [poster, setPoster] = useState<string | undefined>();
  const [ratio, setRatio] = useState("9/16");

  useEffect(() => {
    let cancelled = false;
    const vid = document.createElement("video");
    vid.crossOrigin = "anonymous";
    vid.muted = true;
    vid.playsInline = true;
    vid.preload = "metadata";
    vid.src = src;

    const capture = () => {
      if (cancelled || vid.videoWidth === 0) return;
      setRatio(`${vid.videoWidth}/${vid.videoHeight}`);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = vid.videoWidth;
        canvas.height = vid.videoHeight;
        canvas.getContext("2d")?.drawImage(vid, 0, 0);
        const url = canvas.toDataURL("image/jpeg", 0.85);
        if (url.startsWith("data:image")) setPoster(url);
      } catch {
        // CORS restriction — proceed without poster
      }
      // Notify parent so it can scroll to bottom after the bubble settles
      onReady?.();
    };

    vid.addEventListener("loadeddata", capture);
    vid.addEventListener("seeked", capture);
    vid.currentTime = 0.01;
    vid.load();

    return () => { cancelled = true; };
  }, [src, onReady]);

  return (
    <video
      controls
      playsInline
      preload="metadata"
      poster={poster}
      className="media-bubble rounded-xl"
      style={{ aspectRatio: ratio }}
    >
      <source src={src} type="video/mp4" />
      <source src={src} type="video/quicktime" />
      <source src={src} type="video/webm" />
    </video>
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
          className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-black"
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
