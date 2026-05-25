"use client";

import { Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { TraceFrame, TraceResult } from "@/types/trace";
import ArrayTraceRenderer from "./ArrayTraceRenderer";
import DPTraceRenderer from "./DPTraceRenderer";
import GenericTraceRenderer from "./GenericTraceRenderer";
import GraphTraceRenderer from "./GraphTraceRenderer";

export default function TracePlayer({ result }: { result: TraceResult | null }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(800);
  const frames = useMemo(() => result?.frames ?? [], [result]);
  const frame = frames[Math.min(index, Math.max(frames.length - 1, 0))];

  useEffect(() => {
    if (!playing || !frames.length) return;
    const timer = window.setInterval(() => {
      setIndex((current) => {
        if (current >= frames.length - 1) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, speed);

    return () => window.clearInterval(timer);
  }, [playing, frames.length, speed]);

  if (!result) {
    return (
      <div className="grid min-h-[420px] place-items-center rounded-md border border-dashed border-white/[0.12] text-sm text-zinc-500">
        Generate a trace to start playback.
      </div>
    );
  }

  if (!frame) {
    return (
      <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100">
        {result.fallbackMessage ?? "No frames were generated."}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-white/[0.08] bg-[#111] p-3">
        <Control onClick={() => setIndex((value) => Math.max(0, value - 1))}>
          <SkipBack className="h-4 w-4" /> Prev
        </Control>
        <button
          type="button"
          onClick={() => setPlaying((value) => !value)}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-white px-3 text-sm font-bold text-black"
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {playing ? "Pause" : "Play"}
        </button>
        <Control onClick={() => setIndex((value) => Math.min(frames.length - 1, value + 1))}>
          Next <SkipForward className="h-4 w-4" />
        </Control>
        <Control onClick={() => {
          setPlaying(false);
          setIndex(0);
        }}>
          <RotateCcw className="h-4 w-4" /> Reset
        </Control>
        <label className="ml-auto flex items-center gap-2 text-xs font-semibold text-zinc-500">
          Speed
          <select
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))}
            className="h-8 rounded-md border border-white/[0.1] bg-[#111] px-2 text-zinc-200"
          >
            <option value={1200}>Slow</option>
            <option value={800}>Normal</option>
            <option value={350}>Fast</option>
          </select>
        </label>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className="h-full bg-signal-blue transition-all"
          style={{ width: `${((index + 1) / Math.max(frames.length, 1)) * 100}%` }}
        />
      </div>

      <div className="rounded-md border border-white/[0.08] bg-[#111] p-4">
        <p className="text-sm leading-6 text-zinc-300">
          <span className="font-bold text-white">Step {frame.step}:</span> {frame.operation}
        </p>
        {frame.explanation ? <p className="mt-1 text-xs leading-5 text-zinc-500">{frame.explanation}</p> : null}
      </div>

      {renderFrame(frame)}

      <div className="grid gap-3 lg:grid-cols-3">
        <Info title="Variables" value={JSON.stringify(frame.variables ?? {}, null, 2)} />
        <Info title="Queue / Stack" value={formatQueueStack(frame)} />
        <Info title="Strategy" value={`${result.strategy}${result.algorithm ? ` / ${result.algorithm}` : ""}`} />
      </div>

      {result.warnings?.length || result.fallbackMessage ? (
        <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-100">
          {[...(result.warnings ?? []), result.fallbackMessage].filter(Boolean).join(" ")}
        </div>
      ) : null}
    </div>
  );
}

function renderFrame(frame: TraceFrame) {
  if (frame.type === "graph") return <GraphTraceRenderer frame={frame} />;
  if (frame.type === "array") return <ArrayTraceRenderer frame={frame} />;
  if (frame.type === "dp") return <DPTraceRenderer frame={frame} />;
  return <GenericTraceRenderer frame={frame} />;
}

function formatQueueStack(frame: TraceFrame) {
  const queue = frame.graph?.queue?.join(" <- ");
  const stack = frame.graph?.stack?.join(" -> ") ?? frame.recursion?.callStack.join(" -> ");
  return [`queue: ${queue || "_"}`, `stack: ${stack || "_"}`].join("\n");
}

function Control({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center gap-2 rounded-md border border-white/[0.1] bg-white/[0.04] px-3 text-sm text-zinc-300 transition hover:border-white/25 hover:text-white"
    >
      {children}
    </button>
  );
}

function Info({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-md border border-white/[0.08] bg-[#111] p-3">
      <h4 className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">{title}</h4>
      <pre className="max-h-40 overflow-auto whitespace-pre-wrap font-mono text-xs leading-5 text-zinc-300">{value || "_"}</pre>
    </div>
  );
}
