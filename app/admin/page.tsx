"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef, useState, useCallback } from "react";

// ─── Video Message — captures first frame as poster so iOS shows a thumbnail ──
function VideoMessage({ src }: { src: string }) {
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
    };

    vid.addEventListener("loadeddata", capture);
    vid.addEventListener("seeked", capture);
    vid.currentTime = 0.01;
    vid.load();

    return () => { cancelled = true; };
  }, [src]);

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
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Conversation, Message, ModelProfile } from "@/lib/types";
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
  Link2,
  Plus,
  Copy,
  Check,
  GitBranch,
  Pencil,
  Settings,
  Upload,
  Lock,
  LockOpen,
} from "lucide-react";

function VerifiedBadge({ size = 14 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ color: "var(--accent-light)", flexShrink: 0 }}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M12.01 2.011a3.2 3.2 0 0 1 2.113 .797l.154 .145l.698 .698a1.2 1.2 0 0 0 .71 .341l.135 .008h1a3.2 3.2 0 0 1 3.195 3.018l.005 .182v1c0 .27 .092 .533 .258 .743l.09 .1l.697 .698a3.2 3.2 0 0 1 .147 4.382l-.145 .154l-.698 .698a1.2 1.2 0 0 0 -.341 .71l-.008 .135v1a3.2 3.2 0 0 1 -3.018 3.195l-.182 .005h-1a1.2 1.2 0 0 0 -.743 .258l-.1 .09l-.698 .697a3.2 3.2 0 0 1 -4.382 .147l-.154 -.145l-.698 -.698a1.2 1.2 0 0 0 -.71 -.341l-.135 -.008h-1a3.2 3.2 0 0 1 -3.195 -3.018l-.005 -.182v-1a1.2 1.2 0 0 0 -.258 -.743l-.09 -.1l-.697 -.698a3.2 3.2 0 0 1 -.147 -4.382l.145 -.154l.698 -.698a1.2 1.2 0 0 0 .341 -.71l.008 -.135v-1l.005 -.182a3.2 3.2 0 0 1 3.013 -3.013l.182 -.005h1a1.2 1.2 0 0 0 .743 -.258l.1 -.09l.698 -.697a3.2 3.2 0 0 1 2.269 -.944zm3.697 7.282a1 1 0 0 0 -1.414 0l-3.293 3.292l-1.293 -1.292l-.094 -.083a1 1 0 0 0 -1.32 1.497l2 2l.094 .083a1 1 0 0 0 1.32 -.083l4 -4l.083 -.094a1 1 0 0 0 -.083 -1.32z" />
    </svg>
  );
}

import { linkifyText } from "@/lib/linkify";
import { ModelAvatar } from "@/components/ModelAvatar";
import type { AppSettings } from "@/lib/types";

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

  // Models / Links tab state
  const [sidebarTab, setSidebarTab] = useState<"chats" | "links" | "settings">("chats");
  const [models, setModels] = useState<ModelProfile[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [showNewModel, setShowNewModel] = useState(false);
  const [newModelName, setNewModelName] = useState("");
  const [newModelSlug, setNewModelSlug] = useState("");
  const [newModelSubtitle, setNewModelSubtitle] = useState("Meet people in CITY");
  const [newModelAvatar, setNewModelAvatar] = useState<File | null>(null);
  const [newModelAvatarPreview, setNewModelAvatarPreview] = useState<string | null>(null);
  const [savingModel, setSavingModel] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [deletingModelSlug, setDeletingModelSlug] = useState<string | null>(null);
  // Redirect editing
  const [editingRedirectSlug, setEditingRedirectSlug] = useState<string | null>(null);
  const [editRedirectUrl, setEditRedirectUrl] = useState("");
  const [redirectToggleOn, setRedirectToggleOn] = useState(false);
  const [savingRedirect, setSavingRedirect] = useState(false);
  // Duplicate
  const [duplicatingSlug, setDuplicatingSlug] = useState<string | null>(null);
  const [duplicateNewSlug, setDuplicateNewSlug] = useState("");
  const [savingDuplicate, setSavingDuplicate] = useState(false);
  // Edit model profile
  const [editingModelSlug, setEditingModelSlug] = useState<string | null>(null);
  const [editModelName, setEditModelName] = useState("");
  const [editModelSlug, setEditModelSlug] = useState("");
  const [editModelSubtitle, setEditModelSubtitle] = useState("");
  const [editModelAvatar, setEditModelAvatar] = useState<File | null>(null);
  const [editModelAvatarPreview, setEditModelAvatarPreview] = useState<string | null>(null);
  const [editLockPopupCustom, setEditLockPopupCustom] = useState(false);
  const [editLockMessage, setEditLockMessage] = useState("");
  const [editLockButtonUrl, setEditLockButtonUrl] = useState("");
  const [editLockButtonLabel, setEditLockButtonLabel] = useState("Message on OnlyFans");
  const [savingEditModel, setSavingEditModel] = useState(false);
  const editAvatarRef = useRef<HTMLInputElement>(null);
  const modelAvatarRef = useRef<HTMLInputElement>(null);

  // Landing settings
  const [landingSettings, setLandingSettings] = useState<AppSettings | null>(null);
  const [overlayOpacity, setOverlayOpacity] = useState(55);
  const [uploadingBgVideo, setUploadingBgVideo] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const [localVideoPreview, setLocalVideoPreview] = useState<string | null>(null);
  const bgVideoRef = useRef<HTMLInputElement>(null);
  const [personaMode, setPersonaMode] = useState<"random" | "fixed">("random");
  const [fixedPersonaName, setFixedPersonaName] = useState("");
  const [fixedPersonaAvatarPreview, setFixedPersonaAvatarPreview] = useState<string | null>(null);
  const [fixedPersonaAvatarFile, setFixedPersonaAvatarFile] = useState<File | null>(null);
  const [removeFixedPersonaAvatar, setRemoveFixedPersonaAvatar] = useState(false);
  const fixedPersonaAvatarRef = useRef<HTMLInputElement>(null);
  const [lockContactName, setLockContactName] = useState("her");
  const [lockButtonUrl, setLockButtonUrl] = useState("");
  const [lockButtonLabel, setLockButtonLabel] = useState("Message on OnlyFans");

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

  const loadModels = useCallback(async () => {
    setModelsLoading(true);
    try {
      const res = await fetch("/api/models");
      const data = await res.json();
      setModels(Array.isArray(data) ? data : []);
    } catch { setModels([]); }
    finally { setModelsLoading(false); }
  }, []);

  // Load models on mount so badge logic works everywhere, reload when Links tab opens
  useEffect(() => {
    loadModels();
  }, [loadModels]);

  useEffect(() => {
    if (sidebarTab === "links") loadModels();
  }, [sidebarTab, loadModels]);

  const applySettingsFromData = useCallback((data: AppSettings) => {
    setLandingSettings(data);
    setOverlayOpacity(Math.round((data.overlay_opacity ?? 0.55) * 100));
    setPersonaMode(data.persona_mode === "fixed" ? "fixed" : "random");
    setFixedPersonaName(data.fixed_persona_name ?? "");
    setFixedPersonaAvatarPreview(data.fixed_persona_avatar_url ?? null);
    setFixedPersonaAvatarFile(null);
    setRemoveFixedPersonaAvatar(false);
    setLockContactName(data.lock_contact_name ?? "her");
    setLockButtonUrl(data.lock_button_url ?? "");
    setLockButtonLabel(data.lock_button_label ?? "Message on OnlyFans");
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      setSettingsError("");
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not load settings");
      }
      applySettingsFromData(data);
    } catch (err) {
      setSettingsError(
        err instanceof Error
          ? err.message
          : "Could not load settings. Run migrations in supabase/schema.sql."
      );
    }
  }, [applySettingsFromData]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    const settingsChannel = supabase
      .channel("admin-app-settings")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "app_settings",
          filter: "id=eq.landing",
        },
        (payload) => {
          applySettingsFromData(payload.new as AppSettings);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(settingsChannel);
    };
  }, [applySettingsFromData]);

  useEffect(() => {
    if (sidebarTab === "settings") {
      setMobileView("chat");
      loadSettings();
    }
  }, [sidebarTab, loadSettings]);

  async function patchSettings(body: Record<string, unknown>) {
    setSavingSettings(true);
    setSettingsError("");
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error ||
            "Could not save settings. Add the app_settings table (Migration 5 in supabase/schema.sql)."
        );
      }
      applySettingsFromData(data);
      return data as AppSettings;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      setSettingsError(msg);
      throw err;
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleBgVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      setSettingsError("Video must be under 50MB.");
      if (bgVideoRef.current) bgVideoRef.current.value = "";
      return;
    }

    const preview = URL.createObjectURL(file);
    setLocalVideoPreview(preview);
    setUploadingBgVideo(true);
    setSettingsError("");

    try {
      const ext = (file.name.split(".").pop() ?? "mp4").toLowerCase();
      const mimeTypes: Record<string, string> = {
        mp4: "video/mp4",
        mov: "video/quicktime",
        webm: "video/webm",
        m4v: "video/mp4",
      };
      const contentType = file.type || mimeTypes[ext] || "video/mp4";
      const path = `landing/background-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("chat-media")
        .upload(path, file, { contentType, upsert: false });

      if (upErr) throw new Error(upErr.message);

      const { data: urlData } = supabase.storage.from("chat-media").getPublicUrl(path);
      await patchSettings({ background_video_url: urlData.publicUrl });
      setLocalVideoPreview(null);
      URL.revokeObjectURL(preview);
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingBgVideo(false);
      if (bgVideoRef.current) bgVideoRef.current.value = "";
    }
  }

  function saveOverlayOpacity(percent: number) {
    patchSettings({ overlay_opacity: percent / 100 });
  }

  async function removeBgVideo() {
    setLocalVideoPreview(null);
    try {
      await patchSettings({ background_video_url: null });
    } catch {
      /* error shown via settingsError */
    }
  }

  const previewVideoUrl =
    localVideoPreview ?? landingSettings?.background_video_url ?? null;

  async function savePersonaSettings() {
    let fixed_persona_avatar_url: string | null = null;

    if (personaMode === "fixed") {
      if (fixedPersonaAvatarFile) {
        const ext = fixedPersonaAvatarFile.name.split(".").pop() ?? "jpg";
        const path = `persona/fixed-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("chat-media")
          .upload(path, fixedPersonaAvatarFile, { upsert: true });
        if (upErr) {
          setSettingsError(upErr.message);
          return;
        }
        const { data: urlData } = supabase.storage.from("chat-media").getPublicUrl(path);
        fixed_persona_avatar_url = urlData.publicUrl;
      } else if (removeFixedPersonaAvatar) {
        fixed_persona_avatar_url = null;
      } else {
        fixed_persona_avatar_url = landingSettings?.fixed_persona_avatar_url ?? null;
      }
    }

    await patchSettings({
      persona_mode: personaMode,
      fixed_persona_name: personaMode === "fixed" ? fixedPersonaName : null,
      fixed_persona_avatar_url: personaMode === "fixed" ? fixed_persona_avatar_url : null,
    });
    setFixedPersonaAvatarFile(null);
    setRemoveFixedPersonaAvatar(false);
  }

  async function saveLockConfig() {
    await patchSettings({
      lock_contact_name: lockContactName,
      lock_button_url: lockButtonUrl || null,
      lock_button_label: lockButtonLabel,
    });
  }

  async function toggleChatLock() {
    if (!selected) return;
    const next = !selected.chat_locked;
    try {
      const res = await fetch(`/api/conversations/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_locked: next }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Could not update lock");
      }
      const updated: Conversation = await res.json();
      setSelected(updated);
      setConversations((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      );
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Could not update lock");
    }
  }

  // Badge is visible only when the conversation's current persona IS the original model name
  function showModelBadge(conv: Conversation) {
    if (!conv.model_slug) return false;
    const model = models.find(m => m.slug === conv.model_slug);
    return model ? model.name === conv.admin_username : false;
  }

  function autoSlug(name: string) {
    return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
  }

  async function handleCreateModel(e: React.FormEvent) {
    e.preventDefault();
    if (!newModelName.trim() || !newModelSlug.trim()) return;
    setSavingModel(true);
    try {
      let avatar_url: string | null = null;
      if (newModelAvatar) {
        const ext = newModelAvatar.name.split(".").pop() ?? "jpg";
        const path = `models/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("chat-media").upload(path, newModelAvatar, { upsert: true });
        if (!upErr) {
          const { data: urlData } = supabase.storage.from("chat-media").getPublicUrl(path);
          avatar_url = urlData.publicUrl;
        }
      }
      const res = await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: newModelSlug.trim(), name: newModelName.trim(), avatar_url, subtitle: newModelSubtitle.trim() }),
      });
      if (res.ok) {
        setShowNewModel(false);
        setNewModelName(""); setNewModelSlug(""); setNewModelSubtitle("Meet people in CITY");
        setNewModelAvatar(null); setNewModelAvatarPreview(null);
        loadModels();
      }
    } finally { setSavingModel(false); }
  }

  async function handleDeleteModel(slug: string) {
    setDeletingModelSlug(slug);
    try {
      await fetch(`/api/models/${slug}`, { method: "DELETE" });
      setModels(prev => prev.filter(m => m.slug !== slug));
    } finally { setDeletingModelSlug(null); }
  }

  function copyLink(slug: string) {
    const url = `${window.location.origin}/${slug}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  }

  function openEditRedirect(m: ModelProfile) {
    setEditingRedirectSlug(m.slug);
    setEditRedirectUrl(m.redirect_url ?? "");
    setRedirectToggleOn(!!m.redirect_url);
    setDuplicatingSlug(null);
  }

  async function patchRedirectUrl(slug: string, url: string | null) {
    setSavingRedirect(true);
    try {
      const res = await fetch(`/api/models/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ redirect_url: url || null }),
      });
      if (res.ok) {
        const updated: ModelProfile = await res.json();
        setModels(prev => prev.map(m => m.slug === slug ? updated : m));
        // Don't close the panel — user may want to keep editing
      }
    } finally { setSavingRedirect(false); }
  }

  async function handleRedirectToggle(m: ModelProfile) {
    const turningOn = !redirectToggleOn;
    setRedirectToggleOn(turningOn);
    // Toggle ON → save the typed URL; Toggle OFF → save null (keeps URL in input)
    await patchRedirectUrl(m.slug, turningOn ? (editRedirectUrl.trim() || null) : null);
  }

  function openDuplicate(m: ModelProfile) {
    setDuplicatingSlug(m.slug);
    setDuplicateNewSlug(`${m.slug}-copy`);
    setEditingRedirectSlug(null);
  }

  async function saveDuplicate(original: ModelProfile) {
    const newSlug = duplicateNewSlug.trim();
    if (!newSlug) return;
    setSavingDuplicate(true);
    try {
      const res = await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: newSlug,
          name: original.name,
          avatar_url: original.avatar_url,
          subtitle: original.subtitle,
          lock_popup_custom: original.lock_popup_custom ?? false,
          lock_message: original.lock_message,
          lock_button_url: original.lock_button_url,
          lock_button_label: original.lock_button_label,
        }),
      });
      if (res.ok) {
        setDuplicatingSlug(null);
        loadModels();
      }
    } finally { setSavingDuplicate(false); }
  }

  function openEditModel(m: ModelProfile) {
    setEditingModelSlug(m.slug);
    setEditModelName(m.name);
    setEditModelSlug(m.slug);
    setEditModelSubtitle(m.subtitle);
    setEditModelAvatarPreview(m.avatar_url);
    setEditModelAvatar(null);
    // Close other panels
    setEditingRedirectSlug(null);
    setDuplicatingSlug(null);
  }

  async function saveEditModel(m: ModelProfile) {
    setSavingEditModel(true);
    try {
      let avatar_url = m.avatar_url;
      if (editModelAvatar) {
        const ext = editModelAvatar.name.split(".").pop() ?? "jpg";
        const path = `models/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("chat-media").upload(path, editModelAvatar, { upsert: true });
        if (!upErr) {
          const { data: urlData } = supabase.storage.from("chat-media").getPublicUrl(path);
          avatar_url = urlData.publicUrl;
        }
      }
      const newSlug = editModelSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || m.slug;
      const res = await fetch(`/api/models/${m.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: newSlug,
          name: editModelName.trim() || m.name,
          subtitle: editModelSubtitle.trim() || m.subtitle,
          avatar_url,
          lock_popup_custom: editLockPopupCustom,
          lock_message: editLockPopupCustom ? editLockMessage.trim() || null : null,
          lock_button_url: editLockPopupCustom ? editLockButtonUrl.trim() || null : null,
          lock_button_label: editLockPopupCustom
            ? editLockButtonLabel.trim() || "Message on OnlyFans"
            : "Message on OnlyFans",
        }),
      });
      if (res.ok) {
        const updated: ModelProfile = await res.json();
        setModels(prev => prev.map(x => x.slug === m.slug ? updated : x));
        setEditingModelSlug(null);
      }
    } finally { setSavingEditModel(false); }
  }

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
        const finalExt = (preview.file.name.split(".").pop() ?? "mp4").toLowerCase();
        const mimeType = preview.file.type || (finalExt === "mp4" ? "video/mp4" : `video/${finalExt}`);
        const storagePath = `${selected.id}/${Date.now()}.${finalExt}`;

        const { error: storageError } = await supabase.storage
          .from("chat-media")
          .upload(storagePath, preview.file, { contentType: mimeType, upsert: false });

        if (storageError) throw new Error(storageError.message);

        const { data: urlData } = supabase.storage
          .from("chat-media")
          .getPublicUrl(storagePath);

        fileUrl = urlData.publicUrl;
        fileType = mimeType.startsWith("image/") ? "image" : "video";
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
          <h1 className="font-bold text-lg text-white">Admin Panel</h1>
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl transition hover:opacity-70"
            style={{ background: "var(--surface2)" }}
            title="Logout"
          >
            <LogOut className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex px-4 py-3 gap-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
          {(
            [
              { id: "chats" as const, label: "Chats", icon: MessageSquare },
              { id: "links" as const, label: "Links", icon: Link2 },
              { id: "settings" as const, label: "Settings", icon: Settings },
            ]
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSidebarTab(id)}
              className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-medium transition"
              style={{
                background: sidebarTab === id ? "var(--accent)" : "var(--surface2)",
                color: sidebarTab === id ? "#0a0a0a" : "var(--text-muted)",
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {sidebarTab === "chats" && (
        <>
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
                      className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-black text-sm"
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
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p
                          className="font-semibold text-sm truncate text-white"
                          style={{ fontWeight: conv.unread_count > 0 ? 700 : 500 }}
                        >
                          {conv.user_username}
                        </p>
                        {conv.chat_locked && (
                          <Lock
                            className="w-3.5 h-3.5 flex-shrink-0"
                            style={{ color: "#f87171" }}
                            aria-label="Chat locked"
                          />
                        )}
                      </div>
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
                    <div className="flex items-center gap-1 mt-0.5 min-w-0">
                      <span className="text-xs flex-shrink-0" style={{ color: "var(--accent-light)" }}>
                        {conv.admin_username}
                      </span>
                      {showModelBadge(conv) && <VerifiedBadge size={11} />}
                      <span className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                        {" · "}{conv.last_message || "No messages yet"}
                      </span>
                    </div>
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
        </>
        )}

        {/* ── Links / Models tab ── */}
        {sidebarTab === "links" && (
          <div className="flex-1 overflow-y-auto">
            {/* New link button */}
            <div className="px-4 pt-4 pb-2">
              <button
                onClick={() => setShowNewModel(v => !v)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm transition active:scale-[0.98]"
                style={{ background: "var(--accent)", color: "#0a0a0a" }}
              >
                <Plus className="w-4 h-4" />
                New Link
              </button>
            </div>

            {/* New link form */}
            {showNewModel && (
              <form onSubmit={handleCreateModel} className="mx-4 mb-4 p-4 rounded-2xl flex flex-col gap-3" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                {/* Avatar upload */}
                <div
                  className="relative w-20 h-20 rounded-full mx-auto cursor-pointer overflow-hidden flex items-center justify-center"
                  style={{ background: "var(--surface)", border: "2px dashed var(--border)" }}
                  onClick={() => modelAvatarRef.current?.click()}
                >
                  {newModelAvatarPreview ? (
                    <img src={newModelAvatarPreview} className="w-full h-full object-cover" alt="avatar" />
                  ) : (
                    <span className="text-xs text-center px-1" style={{ color: "var(--text-muted)" }}>Photo</span>
                  )}
                  <input
                    ref={modelAvatarRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      setNewModelAvatar(f);
                      setNewModelAvatarPreview(URL.createObjectURL(f));
                    }}
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Model name</label>
                  <input
                    type="text"
                    placeholder="e.g. Sofia"
                    value={newModelName}
                    maxLength={30}
                    onChange={(e) => {
                      setNewModelName(e.target.value);
                      if (!newModelSlug || newModelSlug === autoSlug(newModelName)) {
                        setNewModelSlug(autoSlug(e.target.value));
                      }
                    }}
                    required
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
                  />
                </div>

                {/* Slug */}
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>URL slug  <span style={{ color: "var(--accent-light)" }}>/{newModelSlug || "…"}</span></label>
                  <input
                    type="text"
                    placeholder="e.g. sofia"
                    value={newModelSlug}
                    onChange={(e) => setNewModelSlug(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
                  />
                </div>

                {/* Subtitle */}
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Subtitle  <span style={{ opacity: 0.6 }}>(use CITY or COUNTRY)</span></label>
                  <input
                    type="text"
                    value={newModelSubtitle}
                    onChange={(e) => setNewModelSubtitle(e.target.value)}
                    placeholder="Meet people in CITY"
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewModel(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium transition"
                    style={{ background: "var(--surface)", color: "var(--text-muted)" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingModel}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50"
                    style={{ background: "var(--accent)", color: "#0a0a0a" }}
                  >
                    {savingModel ? "Creating…" : "Create"}
                  </button>
                </div>
              </form>
            )}

            {/* Model list */}
            {modelsLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
              </div>
            ) : models.length === 0 && !showNewModel ? (
              <div className="flex flex-col items-center py-12 gap-2">
                <Link2 className="w-8 h-8" style={{ color: "var(--border)" }} />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>No links yet</p>
              </div>
            ) : (
              models.map(m => (
                <div key={m.slug} className="mx-4 mb-3 rounded-2xl overflow-hidden" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  {/* Main row */}
                  <div className="p-3 flex items-center gap-3">
                    {/* Avatar */}
                    <ModelAvatar
                      url={m.avatar_url}
                      name={m.name}
                      className="w-10 h-10 rounded-full object-cover shrink-0 text-sm"
                    />
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="font-semibold text-white text-sm truncate">{m.name}</p>
                        <VerifiedBadge size={14} />
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-xs truncate" style={{ color: "var(--accent-light)" }}>/{m.slug}</p>
                        {/* Mode badge */}
                        <span
                          className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium"
                          style={{
                            background: m.redirect_url ? "rgba(251,191,36,0.15)" : "rgba(124,58,237,0.15)",
                            color: m.redirect_url ? "#fbbf24" : "var(--accent-light)",
                          }}
                        >
                          {m.redirect_url ? "↗ Redirect" : "🌐 Page"}
                        </span>
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Copy */}
                      <button onClick={() => copyLink(m.slug)} className="p-1.5 rounded-lg transition hover:opacity-70"
                        style={{ background: "var(--surface)", color: copiedSlug === m.slug ? "#22c55e" : "var(--text-muted)" }} title="Copy link">
                        {copiedSlug === m.slug ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      {/* Redirect toggle */}
                      <button
                        onClick={() => editingRedirectSlug === m.slug ? setEditingRedirectSlug(null) : openEditRedirect(m)}
                        className="p-1.5 rounded-lg transition hover:opacity-70"
                        style={{ background: editingRedirectSlug === m.slug ? "var(--accent)" : "var(--surface)", color: editingRedirectSlug === m.slug ? "#fff" : "var(--text-muted)" }}
                        title="Set redirect URL"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                        </svg>
                      </button>
                      {/* Edit */}
                      <button
                        onClick={() => editingModelSlug === m.slug ? setEditingModelSlug(null) : openEditModel(m)}
                        className="p-1.5 rounded-lg transition hover:opacity-70"
                        style={{ background: editingModelSlug === m.slug ? "var(--accent)" : "var(--surface)", color: editingModelSlug === m.slug ? "#fff" : "var(--text-muted)" }}
                        title="Edit profile"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {/* Duplicate */}
                      <button
                        onClick={() => duplicatingSlug === m.slug ? setDuplicatingSlug(null) : openDuplicate(m)}
                        className="p-1.5 rounded-lg transition hover:opacity-70"
                        style={{ background: duplicatingSlug === m.slug ? "var(--accent)" : "var(--surface)", color: duplicatingSlug === m.slug ? "#0a0a0a" : "var(--text-muted)" }}
                        title="Duplicate link"
                      >
                        <GitBranch className="w-3.5 h-3.5" />
                      </button>
                      {/* Delete */}
                      <button onClick={() => handleDeleteModel(m.slug)} disabled={deletingModelSlug === m.slug}
                        className="p-1.5 rounded-lg transition hover:bg-red-900/40 disabled:opacity-40" style={{ color: "#f87171" }} title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Redirect edit panel */}
                  {editingRedirectSlug === m.slug && (
                    <div className="px-3 pb-3 flex flex-col gap-3" style={{ borderTop: "1px solid var(--border)" }}>
                      {/* Toggle row */}
                      <div className="flex items-center justify-between pt-3">
                        <div className="flex flex-col gap-0.5">
                          <p className="text-xs font-semibold text-white">
                            {redirectToggleOn ? "Redirect URL" : "Landing Page"}
                          </p>
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                            {redirectToggleOn ? "Visitors are sent to an external URL" : "Visitors see the chat landing page"}
                          </p>
                        </div>
                        {/* iOS-style toggle */}
                        <button
                          onClick={() => handleRedirectToggle(m)}
                          disabled={savingRedirect}
                          className="relative flex-shrink-0 w-12 h-6 rounded-full transition-all duration-200 disabled:opacity-50"
                          style={{ background: redirectToggleOn ? "#f59e0b" : "var(--surface)" }}
                        >
                          <span
                            className="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200"
                            style={{ left: redirectToggleOn ? "calc(100% - 20px)" : "4px" }}
                          />
                        </button>
                      </div>

                      {/* URL input — always visible, URL is never lost on toggle */}
                      <div className="relative">
                        <input
                          type="url"
                          value={editRedirectUrl}
                          onChange={e => setEditRedirectUrl(e.target.value)}
                          placeholder="https://example.com/…"
                          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none pr-16"
                          style={{
                            background: "var(--surface)",
                            border: `1px solid ${redirectToggleOn ? "#f59e0b55" : "var(--border)"}`,
                            color: redirectToggleOn ? "var(--text)" : "var(--text-muted)",
                            opacity: redirectToggleOn ? 1 : 0.6,
                          }}
                        />
                        {savingRedirect && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--text-muted)" }}>
                            Saving…
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Duplicate panel */}
                  {duplicatingSlug === m.slug && (
                    <div className="px-3 pb-3 flex flex-col gap-2" style={{ borderTop: "1px solid var(--border)" }}>
                      <p className="text-xs pt-2 font-medium" style={{ color: "var(--text-muted)" }}>
                        New URL slug for the duplicate
                      </p>
                      <input
                        type="text"
                        value={duplicateNewSlug}
                        onChange={e => setDuplicateNewSlug(e.target.value)}
                        placeholder="e.g. sofia-2"
                        className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                        style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
                      />
                      <div className="flex gap-2">
                        <button onClick={() => setDuplicatingSlug(null)}
                          className="flex-1 py-2 rounded-xl text-xs font-medium" style={{ background: "var(--surface)", color: "var(--text-muted)" }}>
                          Cancel
                        </button>
                        <button onClick={() => saveDuplicate(m)} disabled={savingDuplicate || !duplicateNewSlug.trim()}
                          className="flex-1 py-2 rounded-xl text-xs font-semibold disabled:opacity-50"
                          style={{ background: "var(--accent)", color: "#0a0a0a" }}>
                          {savingDuplicate ? "Creating…" : "Duplicate"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── Edit profile panel ── */}
                  {editingModelSlug === m.slug && (
                    <div className="px-3 pb-3 flex flex-col gap-3" style={{ borderTop: "1px solid var(--border)" }}>
                      <p className="text-xs pt-3 font-semibold text-white">Edit Profile</p>

                      {/* Avatar */}
                      <div
                        className="relative w-20 h-20 rounded-full mx-auto cursor-pointer overflow-hidden flex items-center justify-center"
                        style={{ border: "2px dashed var(--border)" }}
                        onClick={() => editAvatarRef.current?.click()}
                      >
                        {editModelAvatarPreview ? (
                          editModelAvatar ? (
                            <img src={editModelAvatarPreview} className="w-full h-full object-cover" alt="avatar" />
                          ) : (
                            <ModelAvatar
                              url={editModelAvatarPreview}
                              name={editModelName || m.name}
                              className="w-full h-full rounded-full object-cover text-2xl"
                            />
                          )
                        ) : (
                          <span className="text-xs text-center px-1" style={{ color: "var(--text-muted)" }}>Photo</span>
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-full">
                          <Pencil className="w-4 h-4 text-white" />
                        </div>
                        <input
                          ref={editAvatarRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            setEditModelAvatar(f);
                            setEditModelAvatarPreview(URL.createObjectURL(f));
                          }}
                        />
                      </div>

                      {/* Name */}
                      <div>
                        <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Name</label>
                        <input
                          type="text"
                          value={editModelName}
                          maxLength={30}
                          onChange={e => setEditModelName(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
                        />
                      </div>

                      {/* Slug / URL */}
                      <div>
                        <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>
                          URL  <span style={{ color: "var(--accent-light)" }}>/{editModelSlug || "…"}</span>
                        </label>
                        <input
                          type="text"
                          value={editModelSlug}
                          onChange={e => setEditModelSlug(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
                        />
                      </div>

                      {/* Subtitle */}
                      <div>
                        <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Subtitle  <span style={{ opacity: 0.6 }}>(use CITY or COUNTRY)</span></label>
                        <input
                          type="text"
                          value={editModelSubtitle}
                          onChange={e => setEditModelSubtitle(e.target.value)}
                          placeholder="Meet people in CITY"
                          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
                        />
                      </div>

                      <div
                        className="rounded-xl p-3 flex flex-col gap-3"
                        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold text-white">Custom lock popup</p>
                            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                              Photo, name, your text, and button — only for this link
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditLockPopupCustom(!editLockPopupCustom)}
                            className="relative flex-shrink-0 w-11 h-6 rounded-full transition-all"
                            style={{
                              background: editLockPopupCustom ? "var(--accent)" : "var(--surface2)",
                            }}
                          >
                            <span
                              className="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all"
                              style={{
                                left: editLockPopupCustom ? "calc(100% - 20px)" : "4px",
                              }}
                            />
                          </button>
                        </div>
                        {editLockPopupCustom && (
                          <>
                            <div>
                              <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>
                                Popup message
                              </label>
                              <textarea
                                value={editLockMessage}
                                onChange={e => setEditLockMessage(e.target.value)}
                                placeholder="Your free trial has ended…"
                                rows={3}
                                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                                style={{
                                  background: "var(--surface2)",
                                  border: "1px solid var(--border)",
                                  color: "var(--text)",
                                }}
                              />
                            </div>
                            <div>
                              <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>
                                Button link URL
                              </label>
                              <input
                                type="url"
                                value={editLockButtonUrl}
                                onChange={e => setEditLockButtonUrl(e.target.value)}
                                placeholder="https://onlyfans.com/…"
                                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                                style={{
                                  background: "var(--surface2)",
                                  border: "1px solid var(--border)",
                                  color: "var(--text)",
                                }}
                              />
                            </div>
                            <div>
                              <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>
                                Button text
                              </label>
                              <input
                                type="text"
                                value={editLockButtonLabel}
                                onChange={e => setEditLockButtonLabel(e.target.value)}
                                placeholder="Message on OnlyFans"
                                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                                style={{
                                  background: "var(--surface2)",
                                  border: "1px solid var(--border)",
                                  color: "var(--text)",
                                }}
                              />
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button onClick={() => setEditingModelSlug(null)}
                          className="flex-1 py-2.5 rounded-xl text-xs font-medium" style={{ background: "var(--surface)", color: "var(--text-muted)" }}>
                          Cancel
                        </button>
                        <button
                          onClick={() => saveEditModel(m)}
                          disabled={savingEditModel}
                          className="flex-1 py-2.5 rounded-xl text-xs font-semibold disabled:opacity-50"
                          style={{ background: "var(--accent)", color: "#0a0a0a" }}>
                          {savingEditModel ? "Saving…" : "Save Changes"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Chat area / Settings */}
      <div
        className={`flex-1 flex flex-col min-w-0 ${
          mobileView === "list" && sidebarTab !== "settings" ? "hidden md:flex" : "flex"
        }`}
      >
        {sidebarTab === "settings" ? (
          <div className="flex-1 overflow-y-auto px-6 py-6 max-w-lg mx-auto w-full">
            <h2 className="text-xl font-bold text-white mb-1">Landing Page</h2>
            <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
              Background video and overlay for the main and custom model landing pages.
            </p>

            {settingsError && (
              <div
                className="mb-4 px-3 py-2.5 rounded-xl text-xs text-red-300"
                style={{ background: "rgba(127,29,29,0.35)", border: "1px solid rgba(248,113,113,0.4)" }}
              >
                {settingsError}
              </div>
            )}

            <div
              className="rounded-2xl p-4 mb-6 flex flex-col gap-4"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <p className="text-sm font-semibold text-white">Chat persona (new users)</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Choose a random name for each new chat, or use one name for everyone. Model links still use the model&apos;s name.
              </p>
              <div className="flex gap-2">
                {(["random", "fixed"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPersonaMode(mode)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium transition"
                    style={{
                      background: personaMode === mode ? "var(--accent)" : "var(--surface2)",
                      color: personaMode === mode ? "#0a0a0a" : "var(--text-muted)",
                    }}
                  >
                    {mode === "random" ? "Random names" : "One name only"}
                  </button>
                ))}
              </div>
              {personaMode === "fixed" && (
                <>
                  <input
                    type="text"
                    value={fixedPersonaName}
                    onChange={(e) => setFixedPersonaName(e.target.value)}
                    placeholder="e.g. Violet"
                    maxLength={30}
                    className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
                  />
                  <div>
                    <label className="text-xs mb-2 block" style={{ color: "var(--text-muted)" }}>
                      Profile photo (all new chats)
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => fixedPersonaAvatarRef.current?.click()}
                        className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0"
                        style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
                      >
                        {fixedPersonaAvatarPreview ? (
                          <img
                            src={fixedPersonaAvatarPreview}
                            className="w-full h-full object-cover"
                            alt="Persona avatar"
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center text-xs"
                            style={{ color: "var(--text-muted)" }}
                          >
                            Add
                          </div>
                        )}
                      </button>
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => fixedPersonaAvatarRef.current?.click()}
                          className="text-xs font-medium px-3 py-2 rounded-lg"
                          style={{ background: "var(--surface2)", color: "var(--accent-light)" }}
                        >
                          Upload image
                        </button>
                        {fixedPersonaAvatarPreview && (
                          <button
                            type="button"
                            onClick={() => {
                              setFixedPersonaAvatarPreview(null);
                              setFixedPersonaAvatarFile(null);
                              setRemoveFixedPersonaAvatar(true);
                              if (fixedPersonaAvatarRef.current) {
                                fixedPersonaAvatarRef.current.value = "";
                              }
                            }}
                            className="text-xs text-left"
                            style={{ color: "#f87171" }}
                          >
                            Remove photo
                          </button>
                        )}
                      </div>
                    </div>
                    <input
                      ref={fixedPersonaAvatarRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        if (!f.type.startsWith("image/")) {
                          setSettingsError("Please choose an image file.");
                          return;
                        }
                        setSettingsError("");
                        setFixedPersonaAvatarFile(f);
                        setFixedPersonaAvatarPreview(URL.createObjectURL(f));
                        setRemoveFixedPersonaAvatar(false);
                      }}
                    />
                  </div>
                </>
              )}
              <button
                type="button"
                onClick={savePersonaSettings}
                disabled={savingSettings || (personaMode === "fixed" && !fixedPersonaName.trim())}
                className="py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                style={{ background: "var(--accent)", color: "#0a0a0a" }}
              >
                Save persona settings
              </button>
            </div>

            <div
              className="rounded-2xl p-4 mb-6 flex flex-col gap-4"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <p className="text-sm font-semibold text-white">User lock popup</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Default popup for main landing and non-custom chats. Custom landing pages use their own lock settings under Links → Edit profile. Lock a chat from its header — only that user is affected.
              </p>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Custom name in message</label>
                <input
                  type="text"
                  value={lockContactName}
                  onChange={(e) => setLockContactName(e.target.value)}
                  placeholder="e.g. Violet"
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
                />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Button link URL</label>
                <input
                  type="url"
                  value={lockButtonUrl}
                  onChange={(e) => setLockButtonUrl(e.target.value)}
                  placeholder="https://onlyfans.com/…"
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
                />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Button text</label>
                <input
                  type="text"
                  value={lockButtonLabel}
                  onChange={(e) => setLockButtonLabel(e.target.value)}
                  placeholder="Message on OnlyFans"
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
                />
              </div>
              <button
                type="button"
                onClick={saveLockConfig}
                disabled={savingSettings}
                className="py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                style={{ background: "var(--surface2)", color: "var(--text)" }}
              >
                Save lock popup text
              </button>
            </div>

            <div
              className="rounded-2xl p-4 mb-6 flex flex-col gap-4"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <p className="text-sm font-semibold text-white">Background video</p>

              {previewVideoUrl ? (
                <div className="relative rounded-xl overflow-hidden aspect-video bg-black">
                  <video
                    key={previewVideoUrl}
                    src={previewVideoUrl}
                    className="w-full h-full object-cover"
                    muted
                    loop
                    playsInline
                    autoPlay
                    controls
                  />
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: `rgba(0,0,0,${overlayOpacity / 100})` }}
                  />
                </div>
              ) : (
                <div
                  className="rounded-xl aspect-video flex items-center justify-center text-sm"
                  style={{ background: "var(--surface2)", color: "var(--text-muted)" }}
                >
                  No background video set
                </div>
              )}

              <input
                ref={bgVideoRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                className="hidden"
                onChange={handleBgVideoUpload}
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => bgVideoRef.current?.click()}
                  disabled={uploadingBgVideo}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
                  style={{ background: "var(--accent)", color: "#0a0a0a" }}
                >
                  <Upload className="w-4 h-4" />
                  {uploadingBgVideo ? "Uploading…" : previewVideoUrl ? "Replace video" : "Upload video"}
                </button>
                {previewVideoUrl && !uploadingBgVideo && (
                  <button
                    type="button"
                    onClick={removeBgVideo}
                    disabled={savingSettings}
                    className="px-4 py-3 rounded-xl text-sm font-medium text-red-400 disabled:opacity-50"
                    style={{ background: "var(--surface2)" }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div
              className="rounded-2xl p-4 flex flex-col gap-3"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Black overlay opacity</p>
                <span className="text-sm font-medium" style={{ color: "var(--accent-light)" }}>
                  {overlayOpacity}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={overlayOpacity}
                onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                onMouseUp={(e) => saveOverlayOpacity(Number(e.currentTarget.value))}
                onTouchEnd={(e) => saveOverlayOpacity(Number(e.currentTarget.value))}
                className="w-full accent-yellow-400"
              />
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Darkens the video so text stays readable. {savingSettings ? "Saving…" : "Changes save automatically."}
              </p>
            </div>
          </div>
        ) : !selected ? (
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
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-black text-sm flex-shrink-0"
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
                  <span className="flex items-center gap-1">
                    Replying as{" "}
                    <span style={{ color: "var(--accent-light)" }}>
                      {selected.admin_username}
                    </span>
                    {showModelBadge(selected) && <VerifiedBadge size={12} />}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={toggleChatLock}
                title={selected.chat_locked ? "Unlock this chat" : "Lock this chat"}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition active:scale-95 flex-shrink-0"
                style={{
                  background: selected.chat_locked ? "#dc2626" : "var(--surface2)",
                  color: selected.chat_locked ? "#fff" : "var(--accent-light)",
                  border: `1px solid ${selected.chat_locked ? "#dc2626" : "var(--border)"}`,
                }}
              >
                {selected.chat_locked ? (
                  <LockOpen className="w-4 h-4" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                {selected.chat_locked ? "Unlock" : "Lock"}
              </button>
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
                          className="media-bubble rounded-xl"
                        />
                      )}
                      {msg.file_url && msg.file_type === "video" && (
                        <VideoMessage src={msg.file_url} />
                      )}
                      {msg.content && (
                        <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isAdmin ? "text-black" : "text-white"}`}>
                          {linkifyText(msg.content, isAdmin)}
                        </p>
                      )}
                      <p
                        className={`text-xs mt-1 ${
                          isAdmin ? "text-right" : "text-left"
                        }`}
                        style={{ color: isAdmin ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.45)" }}
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
                />
              </div>
              <button
                type="submit"
                disabled={sending || uploading || (!input.trim() && !preview)}
                className="p-3 rounded-xl flex-shrink-0 transition active:scale-95 disabled:opacity-40"
                style={{ background: "var(--accent)" }}
              >
                <Send className="w-5 h-5 text-black" />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
