"use client";

import type { TraceFrame } from "@/types/trace";

export default function DPTraceRenderer({ frame }: { frame: TraceFrame }) {
  const dp = frame.dp;
  if (!dp) return null;

  const activeKey = dp.activeCell?.join(",");
  const updated = new Set((dp.updatedCells ?? []).map((cell) => cell.join(",")));

  return (
    <div className="overflow-auto rounded-md bg-[#101010] p-5">
      <div className="inline-grid gap-1" style={{ gridTemplateColumns: `repeat(${dp.table[0]?.length ?? 1}, minmax(52px, 72px))` }}>
        {dp.table.flatMap((row, rowIndex) =>
          row.map((cell, columnIndex) => {
            const key = `${rowIndex},${columnIndex}`;
            return (
              <div
                key={key}
                className={`grid h-12 place-items-center rounded border font-mono text-sm font-bold ${
                  key === activeKey
                    ? "border-signal-yellow bg-signal-yellow text-black"
                    : updated.has(key)
                      ? "border-signal-green bg-signal-green/15 text-signal-green"
                      : "border-white/[0.08] bg-black/35 text-zinc-300"
                }`}
              >
                {cell}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}
