"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Sparkles, Users } from "lucide-react";

export default function LandingPage() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

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
      router.push(`/chat/${conversation.id}?user=${encodeURIComponent(trimmed)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background orbs */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
      >
        <div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: "var(--accent)" }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full opacity-10 blur-3xl"
          style={{ background: "#2563eb" }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md animate-fade-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4 animate-glow"
            style={{ background: "var(--accent)" }}
          >
            <MessageCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white">
            ChatUp
          </h1>
          <p className="mt-2 text-center" style={{ color: "var(--text-muted)" }}>
            Meet someone new. No sign up required.
          </p>
        </div>

        {/* Features row */}
        <div className="flex justify-center gap-6 mb-8">
          <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
            <Users className="w-4 h-4" style={{ color: "var(--accent-light)" }} />
            Random match
          </div>
          <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
            <Sparkles className="w-4 h-4" style={{ color: "var(--accent-light)" }} />
            Instant chat
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
          <form onSubmit={handleStart} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--text-muted)" }}
              >
                Choose a username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError("");
                }}
                placeholder="e.g. CoolDude99"
                maxLength={20}
                autoComplete="off"
                className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 outline-none transition-all focus:ring-2"
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
                  : "var(--accent)",
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle
                      className="opacity-25"
                      cx="12" cy="12" r="10"
                      stroke="currentColor" strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  Finding a match…
                </span>
              ) : (
                "Chat Now"
              )}
            </button>
          </form>

          <p
            className="mt-4 text-xs text-center"
            style={{ color: "var(--text-muted)" }}
          >
            By chatting, you agree to be respectful and follow community
            guidelines.
          </p>
        </div>
      </div>
    </main>
  );
}
