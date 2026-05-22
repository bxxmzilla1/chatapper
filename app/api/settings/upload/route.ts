import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

const EXT_TO_MIME: Record<string, string> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  m4v: "video/mp4",
};

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const ext = (file.name.split(".").pop() ?? "mp4").toLowerCase();
  const mimeType = file.type || EXT_TO_MIME[ext] || "video/mp4";

  if (!mimeType.startsWith("video/")) {
    return NextResponse.json({ error: "Only video files are allowed" }, { status: 400 });
  }

  const maxSize = 100 * 1024 * 1024;
  if (file.size > maxSize) {
    return NextResponse.json({ error: "Video must be under 100MB" }, { status: 400 });
  }

  const supabase = createServerClient();
  const fileName = `landing/background-${Date.now()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  const { error: uploadError } = await supabase.storage
    .from("chat-media")
    .upload(fileName, buffer, { contentType: mimeType, upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from("chat-media").getPublicUrl(fileName);

  return NextResponse.json({ url: urlData.publicUrl });
}
