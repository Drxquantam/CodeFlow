"use client";

import { useState } from "react";

const memoryItems = [
  { name: "vector distance", value: "O(n*m)", amount: "7.4 MB" },
  { name: "queue frontier", value: "O(n*m)", amount: "2.1 MB" },
  { name: "visited state", value: "merged", amount: "0 MB" },
];

type ComplexityPanelProps = {
  analysis?: {
    timeComplexity?: string;
    timeExplanation?: string;
    spaceComplexity?: string;
    spaceBreakdown?: Array<{ name: string; complexity: string; reason: string }>;
    tleRisk?: string;
  } | null;
};

export default function ComplexityPanel({ analysis }: ComplexityPanelProps) {
  const [constraint, setConstraint] = useState("n <= 100000");
  const displayedMemoryItems = analysis?.spaceBreakdown?.length
    ? analysis.spaceBreakdown.map((item) => ({
        name: item.name,
        value: item.complexity,
        amount: item.reason,
      }))
    : memoryItems;

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-white/[0.08] bg-[#111] p-4">
        <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.18em] text-zinc-400">
          Time Complexity Analyzer
        </h3>
        <div className="text-3xl font-bold text-white">
          {analysis?.timeComplexity ?? "Not analyzed"}
        </div>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          {analysis?.timeExplanation ??
            "Click Analyze Code to calculate complexity with Groq for the current editor content."}
        </p>
      </div>

      <div className="rounded-md border border-white/[0.08] bg-[#111] p-4">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-zinc-400">
          Space Complexity Breakdown
        </h3>
        <div className="space-y-2">
          {displayedMemoryItems.map((item) => (
            <div key={item.name} className="flex items-center gap-3 text-sm">
              <span className="w-32 text-zinc-300">{item.name}</span>
              <span className="text-signal-blue">{item.value}</span>
              <span className="ml-auto max-w-[220px] truncate text-right text-zinc-500">
                {item.amount}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-white/[0.08] bg-[#111] p-4">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-zinc-400">
          Constraint Advisor
        </h3>
        <input
          value={constraint}
          onChange={(event) => setConstraint(event.target.value)}
          className="mb-3 h-10 w-full rounded-md border border-white/[0.09] bg-black px-3 text-sm text-white outline-none focus:border-white/25"
        />
        <p className="text-sm text-zinc-500">
          {analysis?.tleRisk
            ? `AI TLE risk: ${analysis.tleRisk}. Compare this with your constraint: ${constraint}.`
            : "Enter constraints here; Groq analysis will connect code complexity to likely limits."}
        </p>
      </div>
    </div>
  );
}
