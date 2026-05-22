"use client";

import { useState, useEffect } from "react";
import { optimizeAvatarUrl } from "@/lib/optimize-avatar";

type ModelAvatarProps = {
  url: string | null;
  name: string;
  size?: number;
  className?: string;
  priority?: boolean;
  fallback?: "accent" | "muted";
};

export function ModelAvatar({
  url,
  name,
  size = 160,
  className = "rounded-full object-cover",
  priority = false,
  fallback = "accent",
}: ModelAvatarProps) {
  const optimized = optimizeAvatarUrl(url, size);
  const [src, setSrc] = useState(optimized ?? url);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSrc(optimizeAvatarUrl(url, size) ?? url);
    setFailed(false);
  }, [url, size]);

  if (!url || failed || !src) {
    return (
      <div
        className={`flex items-center justify-center font-bold shrink-0 ${fallback === "accent" ? "text-black" : "text-white"} ${className}`}
        style={{
          background: fallback === "accent" ? "#fffc00" : "var(--surface2)",
          width: size,
          height: size,
          minWidth: size,
          minHeight: size,
        }}
      >
        {name[0]?.toUpperCase() ?? "?"}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={className}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
      onError={() => {
        if (url && src !== url) {
          setSrc(url);
          return;
        }
        setFailed(true);
      }}
    />
  );
}
