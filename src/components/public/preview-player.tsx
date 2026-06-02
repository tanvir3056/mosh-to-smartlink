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
    <div className="relative overflow-hidden bg-[#070708]">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,8,10,0.08),rgba(8,8,10,0.04)_38%,rgba(8,8,10,0.28)_100%)]" />
      <div className="relative aspect-square overflow-hidden rounded-t-[1.35rem]">
        <div
          aria-hidden="true"
          className="absolute inset-0 scale-[1.05] bg-cover bg-center opacity-34 blur-[12px] saturate-150"
          style={{ backgroundImage: `url(${artworkUrl})` }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(238,230,214,0.12),transparent_42%),linear-gradient(180deg,rgba(8,8,10,0.02),rgba(8,8,10,0.2)_45%,rgba(8,8,10,0.56)_100%)]" />
        <img
          src={artworkUrl}
          alt={`${artistName} - ${title} artwork`}
          className="absolute inset-0 h-full w-full object-cover object-center contrast-[1.04] saturate-[1.08]"
          loading="eager"
          decoding="async"
          draggable={false}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,8,10,0)_52%,rgba(8,8,10,0.34)_100%)]" />
        {previewUrl ? (
          <button
            type="button"
            onClick={togglePlayback}
            className={cn(
              "absolute right-5 top-5 inline-flex h-[2.45rem] w-[2.45rem] items-center justify-center rounded-full border border-[#eee6d6]/26 bg-[rgba(7,7,8,0.54)] text-[#fff9ec] backdrop-blur-[3px] transition-[transform,background-color,color,border-color,box-shadow] duration-200 ease-out hover:-translate-y-px hover:border-[#eee6d6]/42 hover:bg-[rgba(7,7,8,0.72)] hover:text-white hover:shadow-[0_12px_22px_rgba(0,0,0,0.3)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#eee6d6] active:scale-[0.97]",
              playing &&
                "border-[#f04444]/48 bg-[rgba(179,22,36,0.5)] text-white",
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
