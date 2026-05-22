"use client";

type ChatLockModalProps = {
  contactName: string;
  buttonUrl: string | null;
  buttonLabel: string;
};

export function ChatLockModal({
  contactName,
  buttonUrl,
  buttonLabel,
}: ChatLockModalProps) {
  const name = contactName.trim() || "her";
  const label = buttonLabel.trim() || "Message on OnlyFans";

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
        <p
          id="chat-lock-title"
          className="text-base font-semibold leading-relaxed text-white"
        >
          You&apos;re Free trial has ended, please message{" "}
          <span style={{ color: "var(--accent-light)" }}>{name}</span> on her FREE
          Onlyfans
        </p>

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
