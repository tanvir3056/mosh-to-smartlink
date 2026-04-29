"use client";
/* eslint-disable @next/next/no-img-element */

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export function PreviewPlayer({
  previewUrl,
  artworkUrl,
  title,
  artistName,
}: {
  previewUrl: string | null;
  artworkUrl: string;
  title: string;
  artistName: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const teardownRef = useRef<(() => void) | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    return () => {
      teardownRef.current?.();
      teardownRef.current = null;
      audioRef.current = null;
    };
  }, [previewUrl]);

  const ensureAudio = () => {
    if (!previewUrl) {
      return null;
    }

    if (audioRef.current) {
      return audioRef.current;
    }

    const audio = new Audio(previewUrl);
    audio.preload = "none";

    const handleEnded = () => setPlaying(false);
    const handlePause = () => setPlaying(false);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("pause", handlePause);

    teardownRef.current = () => {
      audio.pause();
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("pause", handlePause);
    };

    audioRef.current = audio;
    return audio;
  };

  const togglePlayback = async () => {
    const audio = ensureAudio();

    if (!audio) {
      return;
    }

    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }

    await audio.play();
    setPlaying(true);
  };

  return (
    <div className="relative overflow-hidden bg-[#0b0d11]">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,10,14,0.08),rgba(8,10,14,0.04)_38%,rgba(8,10,14,0.24)_100%)]" />
      <div className="relative aspect-square overflow-hidden rounded-t-[1.55rem]">
        <div
          aria-hidden="true"
          className="absolute inset-0 scale-[1.03] bg-cover bg-center opacity-28 blur-[10px]"
          style={{ backgroundImage: `url(${artworkUrl})` }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_42%),linear-gradient(180deg,rgba(8,10,14,0.02),rgba(8,10,14,0.18)_45%,rgba(8,10,14,0.5)_100%)]" />
        <img
          src={artworkUrl}
          alt={`${artistName} - ${title} artwork`}
          className="absolute inset-0 h-full w-full object-cover object-center"
          loading="eager"
          decoding="async"
          draggable={false}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,10,14,0)_55%,rgba(8,10,14,0.14)_100%)]" />
        {previewUrl ? (
          <button
            type="button"
            onClick={togglePlayback}
            className={cn(
              "absolute right-3 top-3 inline-flex h-[2.35rem] w-[2.35rem] items-center justify-center rounded-full border border-white/18 bg-[rgba(7,9,12,0.28)] text-white/88 backdrop-blur-[2px] transition-[transform,background-color,color,border-color,box-shadow] duration-200 ease-out hover:-translate-y-px hover:border-white/26 hover:bg-[rgba(7,9,12,0.4)] hover:text-white hover:shadow-[0_12px_22px_rgba(0,0,0,0.2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 active:scale-[0.97]",
              playing &&
                "border-white/28 bg-[rgba(245,241,232,0.22)] text-white",
            )}
            aria-label={playing ? "Pause preview" : "Play preview"}
          >
            {playing ? (
              <Pause className="h-[0.9rem] w-[0.9rem]" />
            ) : (
              <Play className="ml-[1px] h-[0.9rem] w-[0.9rem]" />
            )}
          </button>
        ) : null}
      </div>
    </div>
  );
}
