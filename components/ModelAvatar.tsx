"use client";

import Image from "next/image";
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

  if (optimized) {
    return (
      <Image
        src={optimized}
        alt={name}
        width={size}
        height={size}
        priority={priority}
        className={className}
        unoptimized={false}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center font-bold ${fallback === "accent" ? "text-black" : "text-white"} ${className}`}
      style={{
        background: fallback === "accent" ? "#fffc00" : "var(--surface2)",
        width: size,
        height: size,
      }}
    >
      {name[0]?.toUpperCase() ?? "?"}
    </div>
  );
}
