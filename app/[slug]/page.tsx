"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import type { ModelProfile } from "@/lib/types";
import { LandingBackground } from "@/components/LandingBackground";
import { ModelAvatar } from "@/components/ModelAvatar";
import { getRandomMaleUsername } from "@/lib/male-names";

type Location = { city: string | null; country: string | null; country_code: string | null; region: string | null };

type LandingSettings = {
  background_video_url: string | null;
  overlay_opacity: number;
};

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState<LandingSettings>({
    background_video_url: null,
    overlay_opacity: 0.55,
  });

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
    fetch("/api/settings")
      .then(r => r.json())
      .then((data: LandingSettings) => {
        if (data && typeof data.overlay_opacity === "number") {
          setSettings({
            background_video_url: data.background_video_url ?? null,
            overlay_opacity: data.overlay_opacity,
          });
        }
      })
      .catch(() => {});
  }, []);

  async function handleStart() {
    if (!model) return;
    const username = getRandomMaleUsername();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          city: location?.city ?? null,
          country: location?.country ?? null,
          country_code: location?.country_code ?? null,
          model_slug: model.slug,
          admin_username: model.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start");
      router.push(`/chat/${data.id}?user=${encodeURIComponent(username)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  if (notFound) {
    router.replace("/");
    return null;
  }

  if (!model) {
    return (
      <main className="page-shell items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
      </main>
    );
  }

  const cityName = location?.city ?? location?.region ?? null;
  const subtitle = resolveSubtitle(model.subtitle, cityName, location?.country ?? null);

  return (
    <main className="page-shell overflow-y-auto relative" style={{ background: "var(--bg)" }}>
      <LandingBackground
        videoUrl={settings.background_video_url}
        overlayOpacity={settings.overlay_opacity}
      />

      <div className="absolute top-0 left-0 right-0 h-px z-10"
        style={{ background: "linear-gradient(90deg, transparent, var(--accent), transparent)" }} />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-10">
            <div className="relative mb-5">
              <div
                className="rounded-full overflow-hidden"
                style={{ border: "3px solid var(--accent)", boxShadow: "0 0 32px rgba(255,252,0,0.4)" }}
              >
                <ModelAvatar
                  url={model.avatar_url}
                  name={model.name}
                  size={420}
                  priority
                  className="w-24 h-24 rounded-full object-cover"
                />
              </div>
              <span
                className="absolute bottom-1 right-1 w-4 h-4 rounded-full border-2"
                style={{ background: "#22c55e", borderColor: "var(--bg)" }}
              />
            </div>

            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-3xl font-bold text-white tracking-tight">{model.name}</h1>
              <VerifiedBadge size={26} />
            </div>

            <p className="text-lg font-semibold text-center text-white/80">{subtitle}</p>
          </div>

          <div className="flex flex-col gap-3">
            {error && <p className="text-xs text-red-400 px-1 text-center">{error}</p>}

            <button
              type="button"
              onClick={handleStart}
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

          <div className="mt-6 flex items-center justify-center gap-3 text-xs font-medium">
            {["No account needed", "Free", "Anonymous"].map((label) => (
              <span key={label} className="px-3 py-1 rounded-full"
                style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.85)" }}>
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="relative z-10 pb-8 flex justify-center">
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
          {model.name} · Flinky
        </p>
      </div>
    </main>
  );
}
