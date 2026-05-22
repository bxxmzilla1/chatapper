"use client";

type LandingBackgroundProps = {
  videoUrl: string | null;
  overlayOpacity: number;
};

export function LandingBackground({ videoUrl, overlayOpacity }: LandingBackgroundProps) {
  const opacity = Math.min(1, Math.max(0, overlayOpacity));

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {videoUrl ? (
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover"
          src={videoUrl}
        />
      ) : null}
      <div
        className="absolute inset-0"
        style={{ background: `rgba(0, 0, 0, ${opacity})` }}
      />
    </div>
  );
}
