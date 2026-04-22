"use client";

import Image from "next/image";
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
  const [playing, setPlaying] = useState(false);
  const isInlineArtwork = artworkUrl.startsWith("data:");

  useEffect(() => {
    if (!previewUrl) {
      return;
    }

    const audio = new Audio(previewUrl);
    audioRef.current = audio;

    const handleEnded = () => setPlaying(false);
    const handlePause = () => setPlaying(false);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.pause();
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("pause", handlePause);
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
    <div className="relative overflow-hidden bg-[#0b0d11]">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,10,14,0.08),rgba(8,10,14,0.04)_38%,rgba(8,10,14,0.28)_100%)]" />
      <div className="relative aspect-square overflow-hidden rounded-t-[1.55rem]">
        {isInlineArtwork ? (
          <div
            aria-hidden="true"
            className="absolute inset-0 scale-[1.08] opacity-44 blur-[24px]"
            style={{ backgroundImage: `url(${artworkUrl})`, backgroundPosition: "center", backgroundSize: "cover" }}
          />
        ) : (
          <Image
            src={artworkUrl}
            alt=""
            fill
            priority
            aria-hidden="true"
            sizes="(max-width: 640px) 100vw, 432px"
            className="scale-[1.08] object-cover opacity-44 blur-[24px]"
            unoptimized={false}
          />
        )}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_42%),linear-gradient(180deg,rgba(8,10,14,0.02),rgba(8,10,14,0.18)_45%,rgba(8,10,14,0.5)_100%)]" />
        {isInlineArtwork ? (
          <div
            role="img"
            aria-label={`${artistName} - ${title} artwork`}
            className="absolute inset-0"
            style={{ backgroundImage: `url(${artworkUrl})`, backgroundPosition: "center", backgroundSize: "cover" }}
          />
        ) : (
          <Image
            src={artworkUrl}
            alt={`${artistName} - ${title} artwork`}
            fill
            priority
            sizes="(max-width: 640px) 100vw, 432px"
            className="object-cover object-center"
            unoptimized={false}
          />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,10,14,0)_55%,rgba(8,10,14,0.14)_100%)]" />
        {previewUrl ? (
          <button
            type="button"
            onClick={togglePlayback}
            className={cn(
              "absolute right-3 top-3 inline-flex h-[2.35rem] w-[2.35rem] items-center justify-center rounded-full border border-white/18 bg-[rgba(7,9,12,0.28)] text-white/88 backdrop-blur-[2px] transition-[transform,background-color,color,border-color] duration-200 ease-out hover:border-white/26 hover:bg-[rgba(7,9,12,0.4)] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 active:scale-[0.97]",
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
