"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { LandingBackground } from "@/components/LandingBackground";
import { getRandomMaleUsername } from "@/lib/male-names";

type Location = {
  city: string | null;
  country: string | null;
  country_code: string | null;
  region: string | null;
};

type LandingSettings = {
  background_video_url: string | null;
  overlay_opacity: number;
};

export default function LandingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [location, setLocation] = useState<Location | null>(null);
  const [settings, setSettings] = useState<LandingSettings>({
    background_video_url: null,
    overlay_opacity: 0.55,
  });
  const router = useRouter();

  useEffect(() => {
    fetch("/api/location")
      .then((r) => r.json())
      .then((data: Location) => setLocation(data))
      .catch(() => {});
    fetch("/api/settings")
      .then((r) => r.json())
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
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start");
      if (!data.id) throw new Error("Invalid response");
      router.push(`/chat/${data.id}?user=${encodeURIComponent(username)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  const cityName = location?.city ?? location?.region ?? null;

  return (
    <main className="page-shell overflow-y-auto relative" style={{ background: "var(--bg)" }}>
      <LandingBackground
        videoUrl={settings.background_video_url}
        overlayOpacity={settings.overlay_opacity}
      />

      <div
        className="absolute top-0 left-0 right-0 h-px z-10"
        style={{
          background: "linear-gradient(90deg, transparent, var(--accent), transparent)",
        }}
      />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-12">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
              style={{
                background: "#fffc00",
                boxShadow: "0 0 32px rgba(255,252,0,0.35)",
              }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <path
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  stroke="#0a0a0a"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Flinky</h1>
            <p className="mt-2 text-xl font-semibold text-center text-white">
              {cityName ? (
                <>
                  Meet people in{" "}
                  <span style={{ color: "var(--accent-light)" }}>{cityName}</span>
                </>
              ) : (
                "Meet people near you"
              )}
            </p>
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
                  Matching you…
                </>
              ) : (
                <>
                  Start chatting
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          <div className="mt-6 flex items-center justify-center gap-3 text-xs font-medium">
            {["No account needed", "Free", "Anonymous"].map((label) => (
              <span
                key={label}
                className="px-3 py-1 rounded-full"
                style={{
                  background: "rgba(0,0,0,0.35)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.85)",
                }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="relative z-10 pb-8 flex justify-center">
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
          {cityName ? `${cityName} · ` : ""}Flinky
        </p>
      </div>
    </main>
  );
}
