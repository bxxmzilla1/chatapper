"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Eye, EyeOff } from "lucide-react";

export default function AdminLoginPage() {
  const [passcode, setPasscode] = useState("");
  const [showPasscode, setShowPasscode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!passcode) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });

      if (!res.ok) {
        setError("Incorrect passcode. Try again.");
        setLoading(false);
        return;
      }

      sessionStorage.setItem("admin_auth", "true");
      router.push("/admin");
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  }

  return (
    <main className="page-shell items-center justify-center px-4" style={{ background: "var(--bg)" }}>
      <div className="flex-1 flex items-center justify-center w-full">
      <div
        className="w-full max-w-sm rounded-3xl p-8 shadow-2xl animate-fade-up"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "var(--surface2)" }}
          >
            <ShieldCheck className="w-8 h-8" style={{ color: "var(--accent)" }} />
          </div>
          <h1 className="text-2xl font-bold text-white">Admin Access</h1>
          <p className="text-sm mt-1 text-center" style={{ color: "var(--text-muted)" }}>
            Enter your passcode to continue
          </p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="relative">
            <input
              type={showPasscode ? "text" : "password"}
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
                setError("");
              }}
              placeholder="Enter passcode"
              className="w-full px-4 py-3 pr-12 rounded-xl outline-none text-white"
              style={{
                background: "var(--surface2)",
                border: `1px solid ${error ? "#f87171" : "var(--border)"}`,
                color: "var(--text)",
              }}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPasscode((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 transition hover:opacity-70"
              tabIndex={-1}
            >
              {showPasscode ? (
                <EyeOff className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
              ) : (
                <Eye className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
              )}
            </button>
          </div>

          {error && (
            <p className="text-xs text-red-400 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !passcode}
            className="w-full py-3 rounded-xl font-semibold text-white transition active:scale-95 disabled:opacity-50"
            style={{ background: "var(--accent)" }}
          >
            {loading ? "Verifying…" : "Enter"}
          </button>
        </form>
      </div>
      </div>
    </main>
  );
}
