"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Zap, Users, Heart } from "lucide-react";

type Location = {
  city: string | null;
  country: string | null;
  country_code: string | null;
  region: string | null;
};

function getFlagEmoji(countryCode: string) {
  return countryCode
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0)))
    .join("");
}

export default function LandingPage() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [location, setLocation] = useState<Location | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/location")
      .then((r) => r.json())
      .then((data: Location) => setLocation(data))
      .catch(() => setLocation(null))
      .finally(() => setLocationLoading(false));
  }, []);

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) {
      setError("Please enter a username");
      return;
    }
    if (trimmed.length < 2) {
      setError("Username must be at least 2 characters");
      return;
    }
    if (trimmed.length > 20) {
      setError("Username must be 20 characters or less");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to start chat");
      }

      const conversation = await res.json();
      if (!conversation.id) throw new Error("Invalid server response");
      router.push(
        `/chat/${conversation.id}?user=${encodeURIComponent(trimmed)}`
      );
    } catch (err) {
      setError(
        err instanceof Error && err.message !== "Invalid server response"
          ? err.message
          : "Server error — the app isn't configured yet. Please set up Supabase."
      );
      setLoading(false);
    }
  }

  const hasLocation = location?.city || location?.country;
  const locationLabel = location?.city && location?.country
    ? `${location.city}, ${location.country}`
    : location?.country
    ? location.country
    : null;

  const flag = location?.country_code ? getFlagEmoji(location.country_code) : "";

  const cityName = location?.city ?? location?.region ?? "your city";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: "var(--accent)" }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full opacity-10 blur-3xl"
          style={{ background: "#db2777" }}
        />
        <div
          className="absolute top-3/4 left-1/2 w-56 h-56 rounded-full opacity-8 blur-3xl"
          style={{ background: "#2563eb" }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md animate-fade-up">
        {/* Location pill */}
        <div className="flex justify-center mb-6">
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: locationLoading ? "var(--text-muted)" : "var(--text)",
            }}
          >
            <MapPin
              className="w-3.5 h-3.5 flex-shrink-0"
              style={{ color: "#f472b6" }}
            />
            {locationLoading ? (
              <span style={{ color: "var(--text-muted)" }}>
                Detecting your location…
              </span>
            ) : hasLocation ? (
              <span>
                {flag && <span className="mr-1">{flag}</span>}
                {locationLabel}
              </span>
            ) : (
              <span style={{ color: "var(--text-muted)" }}>
                Location unavailable
              </span>
            )}
          </div>
        </div>

        {/* Hero */}
        <div className="flex flex-col items-center mb-8 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-white leading-tight">
            Meet people{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #a78bfa, #f472b6)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              near you
            </span>
          </h1>
          <p
            className="mt-3 text-base leading-relaxed max-w-sm"
            style={{ color: "var(--text-muted)" }}
          >
            Chat with real people in{" "}
            <span className="text-white font-medium">{cityName}</span>.
            No account. No swiping. Just instant connections.
          </p>
        </div>

        {/* Stats row */}
        <div className="flex justify-center gap-5 mb-8">
          <div
            className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-full"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
            }}
          >
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            People online nearby
          </div>
          <div
            className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-full"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
            }}
          >
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
            Instant match
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-3xl p-8 shadow-2xl"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          {/* Card header */}
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(167,139,250,0.15)" }}
            >
              <Heart className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">
                Find your match in {cityName}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Free · Anonymous · No sign up
              </p>
            </div>
          </div>

          <form onSubmit={handleStart} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--text-muted)" }}
              >
                Pick a nickname
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError("");
                }}
                placeholder="e.g. Explorer, NightOwl…"
                maxLength={20}
                autoComplete="off"
                className="w-full px-4 py-3 rounded-xl outline-none transition-all"
                style={{
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                }}
              />
              <div className="flex justify-between mt-1">
                {error ? (
                  <p className="text-xs text-red-400">{error}</p>
                ) : (
                  <span />
                )}
                <p
                  className="text-xs ml-auto"
                  style={{ color: "var(--text-muted)" }}
                >
                  {username.length}/20
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-semibold text-white transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: loading
                  ? "var(--surface2)"
                  : "linear-gradient(135deg, #7c3aed, #db2777)",
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  Finding someone near you…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Users className="w-4 h-4" />
                  Start Chatting
                </span>
              )}
            </button>
          </form>

          <p
            className="mt-4 text-xs text-center"
            style={{ color: "var(--text-muted)" }}
          >
            By joining, you agree to chat respectfully.
            {hasLocation && (
              <>
                {" "}
                Matching you with people in{" "}
                <span className="text-white">{locationLabel}</span>.
              </>
            )}
          </p>
        </div>

        {/* Bottom trust row */}
        <div
          className="flex justify-center gap-6 mt-6 text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          <span>✓ 100% free</span>
          <span>✓ No account needed</span>
          <span>✓ Local people</span>
        </div>
      </div>
    </main>
  );
}
