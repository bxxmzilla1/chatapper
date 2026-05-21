"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

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
  const router = useRouter();

  useEffect(() => {
    fetch("/api/location")
      .then((r) => r.json())
      .then((data: Location) => setLocation(data))
      .catch(() => {});
  }, []);

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) { setError("Enter a username to continue"); return; }
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
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start");
      if (!data.id) throw new Error("Invalid response");
      router.push(`/chat/${data.id}?user=${encodeURIComponent(trimmed)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  const cityName = location?.city ?? location?.region ?? null;

  return (
    <main
      className="page-shell overflow-y-auto"
      style={{ background: "var(--bg)" }}
    >
      {/* Subtle gradient top accent */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent, var(--accent), transparent)",
        }}
      />


      {/* Main content — vertically centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">

          {/* Wordmark */}
          <div className="flex flex-col items-center mb-12">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                boxShadow: "0 0 32px rgba(124,58,237,0.35)",
              }}
            >
              {/* Minimal chat icon */}
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <path
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              ChatUp
            </h1>
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
                  autoFocus
                  className="w-full px-4 py-4 rounded-2xl text-white text-base outline-none transition-all placeholder-gray-600"
                  style={{
                    background: "var(--surface)",
                    border: `1px solid ${error ? "rgba(248,113,113,0.6)" : "var(--border)"}`,
                    color: "var(--text)",
                  }}
                  onFocus={(e) => {
                    if (!error) e.currentTarget.style.borderColor = "var(--accent)";
                  }}
                  onBlur={(e) => {
                    if (!error) e.currentTarget.style.borderColor = "var(--border)";
                  }}
                />
                {/* Character count inside input */}
                {username.length > 0 && (
                  <span
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs pointer-events-none"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {username.length}/20
                  </span>
                )}
              </div>

              {error && (
                <p className="text-xs text-red-400 px-1">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-2xl font-semibold text-white text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                style={{
                  background: loading
                    ? "var(--surface)"
                    : "linear-gradient(135deg, #7c3aed, #9333ea)",
                  boxShadow: loading ? "none" : "0 4px 24px rgba(124,58,237,0.4)",
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
                    Find a match
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Footer note */}
          <div className="mt-6 flex items-center justify-center gap-3 text-xs font-medium">
            {["No account needed", "Free", "Anonymous"].map((label) => (
              <span
                key={label}
                className="px-3 py-1 rounded-full"
                style={{
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  color: "var(--text-muted)",
                }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom hint */}
      <div className="pb-8 flex justify-center">
        <p
          className="text-xs"
          style={{ color: "rgba(136,136,168,0.4)" }}
        >
          {cityName ? `${cityName} · ` : ""}ChatUp
        </p>
      </div>
    </main>
  );
}
