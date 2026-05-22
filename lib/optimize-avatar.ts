/** Supabase storage URL → resized image via the render API for faster loads */
export function optimizeAvatarUrl(url: string | null, size = 420): string | null {
  if (!url) return null;
  if (!url.includes("supabase.co/storage")) return url;
  const renderUrl = url.replace(
    "/storage/v1/object/public/",
    "/storage/v1/render/image/public/"
  );
  const sep = renderUrl.includes("?") ? "&" : "?";
  return `${renderUrl}${sep}width=${size}&height=${size}&quality=80&resize=cover`;
}
