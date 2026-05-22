"use client";

import { useState, useEffect } from "react";

type ModelAvatarProps = {
  url: string | null;
  name: string;
  className?: string;
  fallback?: "accent" | "muted";
};

export function ModelAvatar({
  url,
  name,
  className = "w-10 h-10 rounded-full object-cover shrink-0",
  fallback = "accent",
}: ModelAvatarProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [url]);

  if (!url || failed) {
    return (
      <div
        className={`flex items-center justify-center font-bold ${fallback === "accent" ? "text-black" : "text-white"} ${className}`}
        style={{
          background: fallback === "accent" ? "#fffc00" : "var(--surface2)",
        }}
      >
        {name[0]?.toUpperCase() ?? "?"}
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={name}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
