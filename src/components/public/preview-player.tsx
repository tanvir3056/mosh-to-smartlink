"use client";

import Image from "next/image";
import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export function PreviewPlayer({
  previewUrl,
  artworkUrl,
}: {
  previewUrl: string | null;
  artworkUrl: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!previewUrl) {
      return;
    }

    const audio = new Audio(previewUrl);
    audioRef.current = audio;

    const handleEnded = () => setPlaying(false);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener("ended", handleEnded);
      audioRef.current = null;
    };
  }, [previewUrl]);

  const togglePlayback = async () => {
    if (!audioRef.current) {
      return;
    }

    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
      return;
    }

    await audioRef.current.play();
    setPlaying(true);
  };

  return (
    <div className="relative overflow-hidden bg-[#111612]">
      <div
        className="absolute inset-0 scale-110 bg-cover bg-center opacity-40 blur-2xl"
        style={{ backgroundImage: `url(${artworkUrl})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/10 to-[#111612]/62" />
      <div className="relative aspect-square">
        <Image
          src={artworkUrl}
          alt=""
          fill
          priority
          sizes="(max-width: 640px) 100vw, 432px"
          className="object-cover"
          unoptimized={artworkUrl.startsWith("data:")}
        />
        {previewUrl ? (
          <button
            type="button"
            onClick={togglePlayback}
            className={cn(
              "absolute left-1/2 top-1/2 inline-flex h-[4.5rem] w-[4.5rem] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/28 bg-[#f7f6f0]/84 text-[#203126] shadow-[0_18px_32px_rgba(0,0,0,0.22)] backdrop-blur-md transition hover:scale-[1.03]",
              playing && "bg-[var(--app-accent)] text-white",
            )}
            aria-label={playing ? "Pause preview" : "Play preview"}
          >
            {playing ? (
              <Pause className="h-8 w-8" />
            ) : (
              <Play className="ml-1 h-8 w-8" />
            )}
          </button>
        ) : (
          <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-white/16 bg-[#1a211c]/72 px-4 py-3 text-center text-sm text-white/78 backdrop-blur-md">
            Preview unavailable for this release.
          </div>
        )}

        <div className="absolute inset-x-4 top-4 flex items-center justify-between">
          <span className="rounded-full border border-white/14 bg-[#141a16]/58 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/78 backdrop-blur-md">
            Released song
          </span>
          {previewUrl ? (
            <span className="rounded-full border border-white/14 bg-[#141a16]/58 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/78 backdrop-blur-md">
              Preview on
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
