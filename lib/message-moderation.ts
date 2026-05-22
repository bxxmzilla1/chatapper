export const MODERATION_NOTICE =
  "Message hidden from user for violating community guidelines";

export function moderationBubbleStyle(hidden: boolean, isUserBubble: boolean) {
  if (!hidden) {
    return {
      background: isUserBubble ? "var(--bubble-user)" : "var(--bubble-admin)",
      border: "1px solid transparent",
    };
  }
  return {
    background: "rgba(127, 29, 29, 0.55)",
    border: "1px solid #ef4444",
  };
}

export function moderationTextClass(hidden: boolean, isUserBubble: boolean) {
  if (!hidden) {
    return isUserBubble ? "text-black" : "text-white";
  }
  return "text-red-200";
}
