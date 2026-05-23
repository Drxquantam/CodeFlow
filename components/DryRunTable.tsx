"use client";

import type { TraceResponse } from "@/app/api/trace/route";

type DryRunTableProps = {
  trace: TraceResponse | null;
  loading: boolean;
  error: string;
  onGenerate: () => void;
};

export default function DryRunTable({ trace, loading, error, onGenerate }: DryRunTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/[0.08] bg-[#111] p-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-400">
            Auto Dry-Run Table
          </h3>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Generates step-by-step variable changes from the current editor code and stdin.
          </p>
        </div>
        <button
          type="button"
          onClick={onGenerate}
          disabled={loading}
          className="rounded-md bg-white px-4 py-2 text-sm font-bold text-black transition hover:bg-zinc-200 disabled:cursor-wait disabled:bg-zinc-500"
        >
          {loading ? "Generating..." : "Generate Dry Run"}
        </button>
      </div>

      {error ? (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {trace ? (
        <>
          <p className="rounded-md border border-white/[0.08] bg-white/[0.03] p-3 text-sm leading-6 text-zinc-300">
            {trace.summary}
          </p>
          <div className="overflow-auto rounded-md border border-white/[0.08] bg-[#111]">
            <table className="w-full min-w-[840px] border-collapse text-left text-sm">
              <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.16em] text-zinc-500">
                <tr>
                  <th className="px-3 py-3">Step</th>
                  <th className="px-3 py-3">Line</th>
                  <th className="px-3 py-3">Action</th>
                  <th className="px-3 py-3">Variables</th>
                  <th className="px-3 py-3">Output</th>
                  <th className="px-3 py-3">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {trace.steps.map((row) => (
                  <tr key={`${row.step}-${row.line}-${row.action}`} className="text-zinc-300">
                    <td className="px-3 py-3 text-white">{row.step}</td>
                    <td className="px-3 py-3 text-signal-blue">{row.line}</td>
                    <td className="px-3 py-3">{row.action}</td>
                    <td className="px-3 py-3 text-signal-green">
                      {Object.entries(row.variables ?? {})
                        .map(([key, value]) => `${key}=${String(value)}`)
                        .join(", ") || "-"}
                    </td>
                    <td className="px-3 py-3 text-zinc-400">{row.output || "-"}</td>
                    <td className="px-3 py-3 text-zinc-500">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="rounded-md border border-white/[0.08] bg-[#111] p-5 text-sm leading-6 text-zinc-500">
          Click Generate Dry Run to create a real trace for your current code.
        </div>
      )}
    </div>
  );
}
