"use client";

import type { TraceFrame } from "@/types/trace";

export default function ArrayTraceRenderer({ frame }: { frame: TraceFrame }) {
  const array = frame.array;
  if (!array) return null;

  const active = new Set(array.activeIndices ?? []);
  const comparing = new Set(array.comparingIndices ?? []);
  const sorted = new Set(array.sortedIndices ?? []);
  const swapped = new Set(array.swappedIndices ?? []);

  return (
    <div className="grid min-h-[360px] place-items-center rounded-md bg-[#101010] p-6">
      <div className="flex max-w-full flex-wrap items-end justify-center gap-3">
        {array.values.map((value, index) => {
          const label = index === array.low ? "low" : index === array.mid ? "mid" : index === array.high ? "high" : "";
          const stateClass = active.has(index)
            ? "border-signal-yellow bg-signal-yellow text-black"
            : swapped.has(index)
              ? "border-pink-400 bg-pink-400/20 text-pink-100"
              : comparing.has(index)
                ? "border-signal-blue bg-signal-blue/20 text-white"
                : sorted.has(index)
                  ? "border-signal-green bg-signal-green/20 text-signal-green"
                  : "border-white/[0.1] bg-black/40 text-zinc-200";

          return (
            <div key={`${value}-${index}`} className="text-center">
              <div className={`grid h-16 min-w-16 place-items-center rounded-md border px-4 font-mono text-lg font-bold transition ${stateClass}`}>
                {value}
              </div>
              <p className="mt-2 h-4 text-xs text-zinc-600">{index}</p>
              <p className="h-4 text-[11px] font-bold uppercase tracking-[0.12em] text-signal-blue">{label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
