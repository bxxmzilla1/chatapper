"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import type { ModelProfile } from "@/lib/types";

/** Converts a Supabase storage URL to a resized/compressed version via the render API */
function optimizeAvatarUrl(url: string | null, size = 420): string | null {
  if (!url) return null;
  return url
    .replace("/storage/v1/object/public/", "/storage/v1/render/image/public/")
    .concat(`?width=${size}&height=${size}&quality=80&resize=cover`);
}

type Location = { city: string | null; country: string | null; country_code: string | null; region: string | null };

function VerifiedBadge({ size = 20 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ color: "var(--accent-light)", flexShrink: 0 }}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M12.01 2.011a3.2 3.2 0 0 1 2.113 .797l.154 .145l.698 .698a1.2 1.2 0 0 0 .71 .341l.135 .008h1a3.2 3.2 0 0 1 3.195 3.018l.005 .182v1c0 .27 .092 .533 .258 .743l.09 .1l.697 .698a3.2 3.2 0 0 1 .147 4.382l-.145 .154l-.698 .698a1.2 1.2 0 0 0 -.341 .71l-.008 .135v1a3.2 3.2 0 0 1 -3.018 3.195l-.182 .005h-1a1.2 1.2 0 0 0 -.743 .258l-.1 .09l-.698 .697a3.2 3.2 0 0 1 -4.382 .147l-.154 -.145l-.698 -.698a1.2 1.2 0 0 0 -.71 -.341l-.135 -.008h-1a3.2 3.2 0 0 1 -3.195 -3.018l-.005 -.182v-1a1.2 1.2 0 0 0 -.258 -.743l-.09 -.1l-.697 -.698a3.2 3.2 0 0 1 -.147 -4.382l.145 -.154l.698 -.698a1.2 1.2 0 0 0 .341 -.71l.008 -.135v-1l.005 -.182a3.2 3.2 0 0 1 3.013 -3.013l.182 -.005h1a1.2 1.2 0 0 0 .743 -.258l.1 -.09l.698 -.697a3.2 3.2 0 0 1 2.269 -.944zm3.697 7.282a1 1 0 0 0 -1.414 0l-3.293 3.292l-1.293 -1.292l-.094 -.083a1 1 0 0 0 -1.32 1.497l2 2l.094 .083a1 1 0 0 0 1.32 -.083l4 -4l.083 -.094a1 1 0 0 0 -.083 -1.32z" />
    </svg>
  );
}

function resolveSubtitle(template: string, city: string | null, country: string | null) {
  return template
    .replace(/CITY/g, city ?? "your city")
    .replace(/COUNTRY/g, country ?? "your country");
}

export default function ModelLandingPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params?.slug ?? "";

  const [model, setModel] = useState<ModelProfile | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [location, setLocation] = useState<Location | null>(null);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/models/${slug}`)
      .then(r => { if (!r.ok) { setNotFound(true); return null; } return r.json(); })
      .then(data => {
        if (!data) return;
        if (data.redirect_url) {
          window.location.replace(data.redirect_url);
          return;
        }
        setModel(data);
      })
      .catch(() => setNotFound(true));
  }, [slug]);

  useEffect(() => {
    fetch("/api/location")
      .then(r => r.json())
      .then((data: Location) => setLocation(data))
      .catch(() => {});
  }, []);

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    if (!model) return;
    const trimmed = username.trim();
    if (!trimmed) { setError("Enter a nickname to continue"); return; }
    if (trimmed.length < 2) { setError("At least 2 characters"); return; }
    if (trimmed.length > 20) { setError("Max 20 characters"); return; }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: trimmed,
          city: location?.city ?? null,
          country: location?.country ?? null,
          country_code: location?.country_code ?? null,
          model_slug: model.slug,
          admin_username: model.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start");
      router.push(`/chat/${data.id}?user=${encodeURIComponent(trimmed)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  if (notFound) {
    // Redirect to home for unknown slugs
    router.replace("/");
    return null;
  }

  if (!model) {
    return (
      <main className="page-shell items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </main>
    );
  }

  const cityName = location?.city ?? location?.region ?? null;
  const subtitle = resolveSubtitle(model.subtitle, cityName, location?.country ?? null);

  return (
    <main className="page-shell overflow-y-auto" style={{ background: "var(--bg)" }}>
      {/* Top gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, var(--accent), transparent)" }} />

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">

          {/* Model profile section */}
          <div className="flex flex-col items-center mb-10">
            {/* Avatar */}
            <div className="relative mb-5">
              {model.avatar_url ? (
                <Image
                  src={optimizeAvatarUrl(model.avatar_url) ?? model.avatar_url}
                  alt={model.name}
                  width={420}
                  height={420}
                  priority
                  className="w-24 h-24 rounded-full object-cover"
                  style={{ border: "3px solid var(--accent)", boxShadow: "0 0 32px rgba(255,252,0,0.4)" }}
                />
              ) : (
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-black"
                  style={{ background: "#fffc00", border: "3px solid var(--accent)", boxShadow: "0 0 32px rgba(255,252,0,0.4)" }}
                >
                  {model.name[0]}
                </div>
              )}
              {/* Online indicator */}
              <span
                className="absolute bottom-1 right-1 w-4 h-4 rounded-full border-2"
                style={{ background: "#22c55e", borderColor: "var(--bg)" }}
              />
            </div>

            {/* Name + verified badge */}
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--text)" }}>{model.name}</h1>
              <VerifiedBadge size={26} />
            </div>

            {/* Subtitle */}
            <p className="text-lg font-semibold text-center" style={{ color: "var(--text-muted)" }}>
              {subtitle}
            </p>
          </div>

          {/* Input form */}
          <form onSubmit={handleStart}>
            <div className="flex flex-col gap-3">
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(""); }}
                  placeholder="Your nickname"
                  maxLength={20}
                  autoComplete="off"
                  className="w-full px-4 py-4 rounded-2xl text-base outline-none transition-all placeholder-gray-400"
                  style={{
                    background: "var(--surface)",
                    border: `1px solid ${error ? "rgba(248,113,113,0.6)" : "var(--border)"}`,
                    color: "var(--text)",
                  }}
                  onFocus={(e) => { if (!error) e.currentTarget.style.borderColor = "var(--accent)"; }}
                  onBlur={(e) => { if (!error) e.currentTarget.style.borderColor = "var(--border)"; }}
                />
                {username.length > 0 && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs pointer-events-none"
                    style={{ color: "var(--text-muted)" }}>
                    {username.length}/20
                  </span>
                )}
              </div>

              {error && <p className="text-xs text-red-400 px-1">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-2xl font-semibold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                style={{
                  background: loading ? "var(--surface)" : "#fffc00",
                  color: loading ? "var(--text)" : "#0a0a0a",
                  boxShadow: loading ? "none" : "0 4px 24px rgba(255,252,0,0.35)",
                }}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
                    </svg>
                    Connecting…
                  </>
                ) : (
                  <>
                    Chat with {model.name}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 flex items-center justify-center gap-3 text-xs font-medium">
            {["No account needed", "Free", "Anonymous"].map((label) => (
              <span key={label} className="px-3 py-1 rounded-full"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="pb-8 flex justify-center">
        <p className="text-xs" style={{ color: "rgba(136,136,168,0.4)" }}>
          {model.name} · Flinky
        </p>
      </div>
    </main>
  );
}
