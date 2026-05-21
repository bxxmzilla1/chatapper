import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

// Extension → MIME fallback (iOS often sends empty file.type for .mov/.mp4)
const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  mp4: "video/mp4",
  mov: "video/quicktime",
  m4v: "video/mp4",
  webm: "video/webm",
  "3gp": "video/3gpp",
};

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const conversationId = formData.get("conversation_id") as string | null;

  if (!file || !conversationId) {
    return NextResponse.json(
      { error: "file and conversation_id are required" },
      { status: 400 }
    );
  }

  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  // Use MIME from file object; fall back to extension map (iOS bug workaround)
  const mimeType = file.type || EXT_TO_MIME[ext] || "";

  const isImage = mimeType.startsWith("image/");
  const isVideo = mimeType.startsWith("video/");

  if (!isImage && !isVideo) {
    return NextResponse.json(
      { error: "Only images and videos are allowed" },
      { status: 400 }
    );
  }

  const maxSize = 50 * 1024 * 1024; // 50 MB
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: "File size must be under 50MB" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();
  const fileName = `${conversationId}/${Date.now()}.${ext}`;
  const bucket = "chat-media";

  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(fileName, buffer, { contentType: mimeType });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

  const fileType = isImage ? "image" : "video";

  return NextResponse.json({ url: urlData.publicUrl, fileType });
}
