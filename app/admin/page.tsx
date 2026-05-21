"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Conversation, Message } from "@/lib/types";
import {
  LogOut,
  Send,
  Paperclip,
  Video,
  X,
  Search,
  MessageSquare,
  ArrowLeft,
  MapPin,
  Trash2,
} from "lucide-react";

function getFlagEmoji(code: string) {
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0)))
    .join("");
}

export default function AdminPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<{
    file: File;
    url: string;
    type: "image" | "video";
  } | null>(null);
  const [search, setSearch] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [apiError, setApiError] = useState("");
  const [deletingConvId, setDeletingConvId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Auth guard
  useEffect(() => {
    if (typeof window !== "undefined") {
      const auth = sessionStorage.getItem("admin_auth");
      if (!auth) router.replace("/admin/login");
    }
  }, [router]);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      const data = await res.json();
      if (!res.ok) {
        setApiError(data.error || "Server error — check Supabase env vars");
        setConversations([]);
      } else {
        setApiError("");
        setConversations(Array.isArray(data) ? data : []);
      }
    } catch {
      setApiError("Could not reach server");
      setConversations([]);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Subscribe to new conversations
  useEffect(() => {
    const channel = supabase
      .channel("admin-conversations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadConversations]);

  // Load messages for selected conversation
  useEffect(() => {
    if (!selected) return;

    async function loadMessages() {
      const res = await fetch(`/api/messages?conversation_id=${selected!.id}`);
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);

      // Reset unread
      await fetch(`/api/conversations/${selected!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unread_count: 0 }),
      });

      setTimeout(scrollToBottom, 100);
    }

    loadMessages();
  }, [selected, scrollToBottom]);

  // Subscribe to messages in selected conversation
  useEffect(() => {
    if (!selected) return;

    const channel = supabase
      .channel(`admin-conv:${selected.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selected.id}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          setTimeout(scrollToBottom, 50);

          // Clear unread for selected
          if (msg.sender_type === "user") {
            fetch(`/api/conversations/${selected.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ unread_count: 0 }),
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selected, scrollToBottom]);

  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault();
    if (!selected) return;
    const trimmed = input.trim();
    if (!trimmed && !preview) return;
    if (sending || uploading) return;

    setSending(true);

    try {
      let fileUrl: string | null = null;
      let fileType: "image" | "video" | null = null;

      if (preview) {
        setUploading(true);
        const fd = new FormData();
        fd.append("file", preview.file);
        fd.append("conversation_id", selected.id);
        const upRes = await fetch("/api/upload", { method: "POST", body: fd });
        if (!upRes.ok) throw new Error("Upload failed");
        const upData = await upRes.json();
        fileUrl = upData.url;
        fileType = upData.fileType;
        setUploading(false);
        setPreview(null);
      }

      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: selected.id,
          content: trimmed || null,
          sender_type: "admin",
          file_url: fileUrl,
          file_type: fileType,
        }),
      });

      setInput("");
    } catch {
      // silently handle
    } finally {
      setSending(false);
      setUploading(false);
    }
  }

  async function deleteConversation(convId: string) {
    setDeletingConvId(convId);
    setConfirmDeleteId(null);
    try {
      await fetch(`/api/conversations/${convId}`, { method: "DELETE" });
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (selected?.id === convId) {
        setSelected(null);
        setMessages([]);
        setMobileView("list");
      }
    } catch {
      // silently handle
    } finally {
      setDeletingConvId(null);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const type = file.type.startsWith("image/") ? "image" : "video";
    setPreview({ file, url: URL.createObjectURL(file), type });
    if (fileRef.current) fileRef.current.value = "";
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays === 0)
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return "Yesterday";
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  function handleLogout() {
    sessionStorage.removeItem("admin_auth");
    router.push("/admin/login");
  }

  const filtered = conversations.filter(
    (c) =>
      c.user_username.toLowerCase().includes(search.toLowerCase()) ||
      c.admin_username.toLowerCase().includes(search.toLowerCase())
  );

  function selectConv(conv: Conversation) {
    setSelected(conv);
    setMessages([]);
    setMobileView("chat");
  }

  return (
    <div
      className="page-shell"
      style={{ background: "var(--bg)", flexDirection: "row" }}
    >
      {/* Sidebar */}
      <div
        className={`flex flex-col w-full md:w-80 lg:w-96 flex-shrink-0 ${
          mobileView === "chat" ? "hidden md:flex" : "flex"
        }`}
        style={{
          background: "var(--surface)",
          borderRight: "1px solid var(--border)",
        }}
      >

        {/* Sidebar header */}
        <div
          className="px-4 py-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div>
            <h1 className="font-bold text-lg text-white">Admin Panel</h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl transition hover:opacity-70"
            style={{ background: "var(--surface2)" }}
            title="Logout"
          >
            <LogOut className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          </button>
        </div>

        {/* Error banner */}
        {apiError && (
          <div className="mx-4 mt-3 px-3 py-2 rounded-xl text-xs text-red-300 bg-red-900/30 border border-red-800">
            ⚠ {apiError}
          </div>
        )}

        {/* Search */}
        <div className="px-4 py-3">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: "var(--surface2)" }}
          >
            <Search className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search users…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent outline-none text-sm w-full"
              style={{ color: "var(--text)" }}
            />
          </div>
        </div>

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <MessageSquare className="w-8 h-8" style={{ color: "var(--border)" }} />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                No conversations yet
              </p>
            </div>
          ) : (
            filtered.map((conv) => {
              const isSelected = selected?.id === conv.id;
              const locationLabel = conv.user_city && conv.user_country
                ? `${conv.user_city}, ${conv.user_country}`
                : conv.user_country ?? null;
              const flag = conv.user_country_code
                ? getFlagEmoji(conv.user_country_code)
                : "";
              return (
                <div
                  key={conv.id}
                  className="group/row relative"
                >
                {/* Inline delete confirmation */}
                {confirmDeleteId === conv.id && (
                  <div
                    className="absolute inset-0 z-10 flex items-center justify-center gap-2 px-4 rounded-sm"
                    style={{ background: "rgba(15,15,19,0.95)", backdropFilter: "blur(4px)" }}
                  >
                    <p className="text-xs text-white flex-1">Delete this chat?</p>
                    <button
                      onClick={() => deleteConversation(conv.id)}
                      disabled={deletingConvId === conv.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition active:scale-95 disabled:opacity-50"
                      style={{ background: "#dc2626" }}
                    >
                      {deletingConvId === conv.id ? "Deleting…" : "Delete"}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition"
                      style={{ background: "var(--surface2)", color: "var(--text-muted)" }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
                <button
                  onClick={() => selectConv(conv)}
                  className="w-full flex items-start gap-3 px-4 py-3.5 transition text-left"
                  style={{
                    background: isSelected ? "var(--surface2)" : "transparent",
                    borderLeft: isSelected
                      ? "3px solid var(--accent)"
                      : "3px solid transparent",
                    opacity: deletingConvId === conv.id ? 0.4 : 1,
                  }}
                >
                  {/* Avatar with unread dot */}
                  <div className="relative flex-shrink-0 mt-0.5">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-white text-sm"
                      style={{ background: "var(--accent)" }}
                    >
                      {conv.user_username[0].toUpperCase()}
                    </div>
                    {conv.unread_count > 0 && (
                      <span
                        className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
                        style={{ background: "#ec4899" }}
                      >
                        {conv.unread_count > 9 ? "9+" : conv.unread_count}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Row 1: name + time */}
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className="font-semibold text-sm truncate text-white"
                        style={{ fontWeight: conv.unread_count > 0 ? 700 : 500 }}
                      >
                        {conv.user_username}
                      </p>
                      <span
                        className="text-xs flex-shrink-0"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {formatTime(conv.last_message_at)}
                      </span>
                    </div>

                    {/* Row 2: location badge */}
                    {locationLabel && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin className="w-2.5 h-2.5 flex-shrink-0" style={{ color: "#f472b6" }} />
                        <span className="text-xs truncate" style={{ color: "#f472b6" }}>
                          {flag && <span className="mr-0.5">{flag}</span>}
                          {locationLabel}
                        </span>
                      </div>
                    )}

                    {/* Row 3: persona + last message */}
                    <p
                      className="text-xs truncate mt-0.5"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <span style={{ color: "var(--accent-light)" }}>
                        {conv.admin_username}
                      </span>
                      {" · "}
                      {conv.last_message || "No messages yet"}
                    </p>
                  </div>
                </button>

                {/* Delete chat button — hover reveal */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDeleteId(conv.id);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover/row:opacity-100 p-1.5 rounded-lg transition-all hover:bg-red-900/40"
                  title="Delete chat"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Chat area */}
      <div
        className={`flex-1 flex flex-col min-w-0 ${
          mobileView === "list" ? "hidden md:flex" : "flex"
        }`}
      >
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <MessageSquare
              className="w-16 h-16"
              style={{ color: "var(--border)" }}
            />
            <p className="text-lg font-medium text-white">
              Select a conversation
            </p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Pick a chat from the left to start replying
            </p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div
              className="flex items-center gap-3 px-4 py-3"
              style={{
                background: "var(--surface)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <button
                onClick={() => setMobileView("list")}
                className="md:hidden p-2 rounded-xl"
                style={{ background: "var(--surface2)" }}
              >
                <ArrowLeft className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
              </button>
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
                style={{ background: "var(--accent)" }}
              >
                {selected.user_username[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-white truncate">
                    {selected.user_username}
                  </p>
                  {selected.user_country_code && (
                    <span className="text-sm flex-shrink-0">
                      {getFlagEmoji(selected.user_country_code)}
                    </span>
                  )}
                </div>
                <p className="text-xs flex items-center gap-1.5 flex-wrap" style={{ color: "var(--text-muted)" }}>
                  {selected.user_city && (
                    <span className="flex items-center gap-0.5" style={{ color: "#f472b6" }}>
                      <MapPin className="w-2.5 h-2.5" />
                      {selected.user_city}{selected.user_country ? `, ${selected.user_country}` : ""}
                    </span>
                  )}
                  {selected.user_city && <span>·</span>}
                  <span>
                    Replying as{" "}
                    <span style={{ color: "var(--accent-light)" }}>
                      {selected.admin_username}
                    </span>
                  </span>
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
              {messages.map((msg, i) => {
                // System checkpoint — user switched match
                if (
                  msg.sender_type === "system" &&
                  msg.content?.startsWith("SWITCH:")
                ) {
                  const newName = msg.content.replace("SWITCH:", "");
                  return (
                    <div
                      key={msg.id}
                      className="flex flex-col items-center gap-1.5 py-2 animate-fade-up"
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div
                          className="flex-1 h-px"
                          style={{ background: "var(--border)" }}
                        />
                        <div
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
                          style={{
                            background: "rgba(124,58,237,0.15)",
                            border: "1px solid rgba(124,58,237,0.4)",
                            color: "var(--accent-light)",
                          }}
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
                            />
                          </svg>
                          User switched persona → now{" "}
                          <span className="font-bold text-white">{newName}</span>
                        </div>
                        <div
                          className="flex-1 h-px"
                          style={{ background: "var(--border)" }}
                        />
                      </div>
                      <p
                        className="text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Reply as{" "}
                        <span style={{ color: "var(--accent-light)" }}>
                          {newName}
                        </span>{" "}
                        from now on ·{" "}
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  );
                }

                const isAdmin = msg.sender_type === "admin";
                const prevMsg = messages[i - 1];
                const showName =
                  i === 0 || prevMsg?.sender_type !== msg.sender_type;

                // Determine which persona was active at this point
                let personaAtPoint = selected.user_username;
                if (isAdmin) {
                  // Find latest SWITCH before this message
                  let activePersona = messages
                    .slice(0, i)
                    .filter(
                      (m) =>
                        m.sender_type === "system" &&
                        m.content?.startsWith("SWITCH:")
                    )
                    .pop();
                  personaAtPoint = activePersona
                    ? activePersona.content!.replace("SWITCH:", "")
                    : selected.admin_username;
                  // Fall back to conversation's original admin name if no switch
                  // (look for first admin persona — it's the original admin_username snapshot)
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      isAdmin ? "items-end" : "items-start"
                    } animate-fade-up`}
                  >
                    {showName && (
                      <p
                        className="text-xs mb-1 px-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {isAdmin
                          ? `You (as ${personaAtPoint})`
                          : selected.user_username}
                      </p>
                    )}
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 relative ${
                        isAdmin
                          ? "bubble-user rounded-br-sm"
                          : "bubble-admin rounded-bl-sm"
                      }`}
                      style={{
                        background: isAdmin
                          ? "var(--bubble-user)"
                          : "var(--bubble-admin)",
                      }}
                    >
                      {msg.file_url && msg.file_type === "image" && (
                        <img
                          src={msg.file_url}
                          alt="shared"
                          className="rounded-xl max-w-full max-h-64 object-cover mb-1"
                        />
                      )}
                      {msg.file_url && msg.file_type === "video" && (
                        <video
                          src={msg.file_url}
                          controls
                          playsInline
                          preload="metadata"
                          width={1280}
                          height={720}
                          className="rounded-xl w-full mb-1 block"
                          style={{ maxWidth: "320px", maxHeight: "180px", objectFit: "cover" }}
                        />
                      )}
                      {msg.content && (
                        <p className="text-sm leading-relaxed text-white whitespace-pre-wrap">
                          {msg.content}
                        </p>
                      )}
                      <p
                        className={`text-xs mt-1 ${
                          isAdmin ? "text-right" : "text-left"
                        }`}
                        style={{ color: "rgba(255,255,255,0.45)" }}
                      >
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* File preview */}
            {preview && (
              <div
                className="px-4 py-2 flex items-center gap-3"
                style={{
                  background: "var(--surface)",
                  borderTop: "1px solid var(--border)",
                }}
              >
                <div className="relative">
                  {preview.type === "image" ? (
                    <img
                      src={preview.url}
                      alt="preview"
                      className="h-14 w-14 rounded-lg object-cover"
                    />
                  ) : (
                    <div
                      className="h-14 w-14 rounded-lg flex items-center justify-center"
                      style={{ background: "var(--surface2)" }}
                    >
                      <Video
                        className="w-6 h-6"
                        style={{ color: "var(--accent)" }}
                      />
                    </div>
                  )}
                  <button
                    onClick={() => setPreview(null)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: "var(--border)" }}
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {uploading ? "Uploading…" : preview.file.name}
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
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFileSelect}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="p-2.5 rounded-xl flex-shrink-0 transition hover:opacity-70"
                style={{ background: "var(--surface2)" }}
              >
                <Paperclip
                  className="w-5 h-5"
                  style={{ color: "var(--text-muted)" }}
                />
              </button>
              <div
                className="flex-1 flex items-end rounded-2xl px-4 py-2.5 min-h-[48px]"
                style={{
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                }}
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder={`Reply as ${selected.admin_username}…`}
                  rows={1}
                  className="flex-1 resize-none bg-transparent outline-none text-sm text-white placeholder-gray-500 leading-relaxed max-h-32 overflow-y-auto"
                  style={{ color: "var(--text)" }}
                />
              </div>
              <button
                type="submit"
                disabled={sending || uploading || (!input.trim() && !preview)}
                className="p-3 rounded-xl flex-shrink-0 transition active:scale-95 disabled:opacity-40"
                style={{ background: "var(--accent)" }}
              >
                <Send className="w-5 h-5 text-white" />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
