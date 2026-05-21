import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let ffmpeg: FFmpeg | null = null;

const CORE_VERSION = "0.12.10";
const CORE_BASE = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd`;

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg) return ffmpeg;
  ffmpeg = new FFmpeg();
  // Single-threaded core — does NOT require SharedArrayBuffer or COOP/COEP headers
  await ffmpeg.load({
    coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
  });
  return ffmpeg;
}

/** Returns the file unchanged if it's already MP4/WebM; otherwise converts to MP4. */
export async function ensureMp4(
  file: File,
  onProgress?: (pct: number) => void
): Promise<File> {
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  const type = file.type.toLowerCase();

  if (type === "video/mp4" || ext === "mp4") return file;
  if (type === "video/webm" || ext === "webm") return file;

  const instance = await getFFmpeg();

  if (onProgress) {
    instance.on("progress", ({ progress }) => onProgress(Math.round(progress * 100)));
  }

  const inputName = `input.${ext || "mov"}`;
  await instance.writeFile(inputName, await fetchFile(file));

  await instance.exec([
    "-i", inputName,
    "-c:v", "libx264",
    "-preset", "ultrafast", // fastest encode — smaller quality trade-off is fine for chat
    "-crf", "28",
    "-c:a", "aac",
    "-movflags", "faststart", // optimises for streaming/playback before full download
    "output.mp4",
  ]);

  const data = await instance.readFile("output.mp4");
  instance.deleteFile(inputName);
  instance.deleteFile("output.mp4");

  if (onProgress) instance.off("progress", () => {});

  // Copy into a regular ArrayBuffer to satisfy strict TS types
  const raw = data as Uint8Array;
  const buf = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer;
  return new File([buf], "video.mp4", { type: "video/mp4" });
}
