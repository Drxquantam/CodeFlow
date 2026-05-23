"use client";

import { Trash2 } from "lucide-react";
import { useEffect } from "react";
import { useAlgoStore } from "@/store/useAlgoStore";

export default function SubmissionHistory() {
  const history = useAlgoStore((state) => state.history);
  const clearHistory = useAlgoStore((state) => state.clearHistory);
  const loadHistory = useAlgoStore((state) => state.loadHistory);
  const historyStatus = useAlgoStore((state) => state.historyStatus);
  const historyError = useAlgoStore((state) => state.historyError);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  return (
    <div className="rounded-md border border-white/[0.08] bg-[#111] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-400">
          Review History
        </h3>
        {history.length ? (
          <button
            type="button"
            onClick={clearHistory}
            className="inline-flex items-center gap-2 rounded-md border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:border-white/25 hover:text-white"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </button>
        ) : null}
      </div>

      {history.length ? (
        <div className="space-y-2">
          {history.map((attempt, index) => (
            <div
              key={attempt.id}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-md border border-white/[0.06] bg-white/[0.03] px-3 py-3 text-sm"
            >
              <span className="min-w-0 truncate text-zinc-300">
                Attempt {history.length - index} · {attempt.language}
              </span>
              <span className={verdictColor(attempt.verdict)}>{attempt.verdict}</span>
              <span className="text-zinc-500">{attempt.runtime}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-white/[0.06] bg-white/[0.03] p-4 text-sm leading-6 text-zinc-500">
          {historyStatus === "loading"
            ? "Loading database submission history..."
            : "Review code to create database-backed analysis history."}
        </p>
      )}
      {historyError ? (
        <p className="mt-3 rounded-md border border-yellow-500/25 bg-yellow-500/10 p-3 text-xs leading-5 text-yellow-200">
          {historyError}
        </p>
      ) : null}
    </div>
  );
}

function verdictColor(verdict: string) {
  if (verdict === "Analyzed") return "text-green-400";
  if (verdict === "Needs Review") return "text-yellow-400";
  if (verdict === "Analysis Error") return "text-red-400";
  return "text-orange-400";
}
