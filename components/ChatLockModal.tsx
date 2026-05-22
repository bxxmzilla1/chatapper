"use client";

import { ModelAvatar } from "@/components/ModelAvatar";

type ChatLockModalProps = {
  variant?: "global" | "landing";
  contactName?: string;
  lockMessage?: string | null;
  personaName: string;
  avatarUrl: string | null;
  buttonUrl: string | null;
  buttonLabel: string;
};

export function ChatLockModal({
  variant = "global",
  contactName = "",
  lockMessage = "",
  personaName,
  avatarUrl,
  buttonUrl,
  buttonLabel,
}: ChatLockModalProps) {
  const name = contactName.trim() || personaName.trim() || "her";
  const label = buttonLabel.trim() || "Message on OnlyFans";
  const isLanding = variant === "landing";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ background: "rgba(0, 0, 0, 0.72)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="chat-lock-title"
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 text-center shadow-2xl"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-4">
          <div
            className="rounded-full p-0.5"
            style={{
              background: "linear-gradient(135deg, #fffc00, #facc15)",
            }}
          >
            <div
              className="rounded-full overflow-hidden"
              style={{ background: "var(--surface)" }}
            >
              <ModelAvatar
                url={avatarUrl}
                name={personaName}
                className="w-20 h-20 rounded-full object-cover"
              />
            </div>
          </div>
        </div>

        {isLanding ? (
          <>
            <p
              id="chat-lock-title"
              className="text-lg font-bold text-white mb-3"
            >
              {personaName.trim() || name}
            </p>
            {lockMessage?.trim() ? (
              <p
                className="text-base leading-relaxed text-white whitespace-pre-wrap"
                style={{ color: "var(--text)" }}
              >
                {lockMessage.trim()}
              </p>
            ) : (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Add lock popup text in Admin → Links → Edit profile.
              </p>
            )}
          </>
        ) : (
          <p
            id="chat-lock-title"
            className="text-base font-semibold leading-relaxed text-white"
          >
            You&apos;re Free trial has ended, please message{" "}
            <span style={{ color: "var(--accent-light)" }}>{name}</span> on her
            FREE Onlyfans
          </p>
        )}

        {buttonUrl ? (
          <a
            href={buttonUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex w-full items-center justify-center rounded-2xl py-4 text-base font-semibold transition active:scale-[0.98]"
            style={{
              background: "#fffc00",
              color: "#0a0a0a",
              boxShadow: "0 4px 24px rgba(255,252,0,0.35)",
            }}
          >
            {label}
          </a>
        ) : (
          <p className="mt-4 text-xs" style={{ color: "var(--text-muted)" }}>
            Link not configured yet.
          </p>
        )}
      </div>
    </div>
  );
}
