import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

type ConversationLike = {
  id: string;
  user_username: string;
};

export function goToChat(
  router: AppRouterInstance,
  conversation: ConversationLike,
  replace = false
) {
  const url = `/chat/${conversation.id}?user=${encodeURIComponent(conversation.user_username)}`;
  if (replace) {
    router.replace(url);
  } else {
    router.push(url);
  }
}
