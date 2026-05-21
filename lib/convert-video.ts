import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let ffmpeg: FFmpeg | null = null;
let ffmpegLoading: Promise<FFmpeg> | null = null;

const CORE_VERSION = "0.12.10";
const CORE_BASE = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd`;

async function getFFmpeg(): Promise<FFmpeg> {
  // Return existing instance
  if (ffmpeg) return ffmpeg;
  // Prevent parallel load attempts
  if (ffmpegLoading) return ffmpegLoading;

  ffmpegLoading = (async () => {
    const instance = new FFmpeg();
    // Single-threaded core — does NOT require SharedArrayBuffer or COOP/COEP headers
    await instance.load({
      coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
    });
    ffmpeg = instance;
    ffmpegLoading = null;
    return instance;
  })();

  return ffmpegLoading;
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

  const progressHandler = onProgress
    ? ({ progress }: { progress: number }) => onProgress(Math.min(99, Math.round(progress * 100)))
    : null;
  if (progressHandler) instance.on("progress", progressHandler);

  const inputName = `input.${ext || "mov"}`;

  try {
    await instance.writeFile(inputName, await fetchFile(file));

    await instance.exec([
      "-i", inputName,
      // Scale longest side to 720 to keep file small (reduces memory + upload time)
      "-vf", "scale=if(gte(iw\\,ih)\\,min(1280\\,iw)\\,-2):if(gte(iw\\,ih)\\,-2\\,min(720\\,ih))",
      "-c:v", "libx264",
      "-preset", "ultrafast",
      "-crf", "30",           // slightly lower quality = much smaller file
      "-c:a", "aac",
      "-b:a", "96k",
      "-movflags", "faststart",
      "output.mp4",
    ]);

    const data = await instance.readFile("output.mp4");

    // ⚠️ Copy the buffer into a plain ArrayBuffer BEFORE deleting FFmpeg virtual
    // files — deleteFile frees WASM memory that `data` may still point into.
    const raw = data as Uint8Array;
    const buf = raw.buffer.slice(
      raw.byteOffset,
      raw.byteOffset + raw.byteLength
    ) as ArrayBuffer;
    const converted = new File([buf], "video.mp4", { type: "video/mp4" });

    // Safe to clean up now that we have an independent copy
    try { instance.deleteFile(inputName); } catch { /* ignore */ }
    try { instance.deleteFile("output.mp4"); } catch { /* ignore */ }

    if (progressHandler) {
      instance.off("progress", progressHandler);
      onProgress?.(100);
    }

    return converted;
  } catch (err) {
    // Clean up on failure so the next attempt starts fresh
    try { instance.deleteFile(inputName); } catch { /* ignore */ }
    try { instance.deleteFile("output.mp4"); } catch { /* ignore */ }
    if (progressHandler) instance.off("progress", progressHandler);
    // Reset the cached instance so the next call re-initialises cleanly
    ffmpeg = null;
    throw err;
  }
}
