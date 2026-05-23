"use client";

import { Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import { useState } from "react";

const frames = [
  "Initialize distance grid with -1",
  "Push all zero cells into BFS queue",
  "Pop front cell and inspect four directions",
  "Relax unvisited neighbor distance",
  "Return computed first row distances",
];

export default function ReplayControls() {
  const [playing, setPlaying] = useState(false);
  const [frame, setFrame] = useState(1);

  return (
    <div className="rounded-md border border-white/[0.08] bg-[#111] p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-400">
            Runtime Replay
          </h3>
          <p className="mt-2 text-sm text-zinc-500">{frames[frame - 1]}</p>
        </div>
        <span className="text-sm text-zinc-500">
          {frame}/{frames.length}
        </span>
      </div>

      <div className="mb-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full bg-signal-blue transition-all"
          style={{ width: `${(frame / frames.length) * 100}%` }}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <IconButton label="Previous" onClick={() => setFrame((value) => Math.max(1, value - 1))}>
          <SkipBack className="h-4 w-4" />
        </IconButton>
        <IconButton label={playing ? "Pause" : "Play"} onClick={() => setPlaying((value) => !value)}>
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </IconButton>
        <IconButton
          label="Next"
          onClick={() => setFrame((value) => Math.min(frames.length, value + 1))}
        >
          <SkipForward className="h-4 w-4" />
        </IconButton>
        <IconButton
          label="Restart"
          onClick={() => {
            setPlaying(false);
            setFrame(1);
          }}
        >
          <RotateCcw className="h-4 w-4" />
        </IconButton>
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-9 items-center gap-2 rounded-md border border-white/[0.1] bg-white/[0.04] px-3 text-sm text-zinc-300 transition hover:border-white/25 hover:text-white"
    >
      {children}
      {label}
    </button>
  );
}
