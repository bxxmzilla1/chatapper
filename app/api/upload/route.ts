import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

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

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "video/mp4",
    "video/webm",
    "video/quicktime",
  ];

  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: "Only images and videos are allowed" },
      { status: 400 }
    );
  }

  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: "File size must be under 50MB" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();
  const ext = file.name.split(".").pop();
  const fileName = `${conversationId}/${Date.now()}.${ext}`;
  const bucket = "chat-media";

  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(fileName, buffer, { contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

  const fileType = file.type.startsWith("image/") ? "image" : "video";

  return NextResponse.json({ url: urlData.publicUrl, fileType });
}
