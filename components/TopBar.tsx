"use client";

import { BrainCircuit, ChevronDown, FileCode2, Maximize2, Minimize2, PanelBottomClose, RotateCcw } from "lucide-react";
import { SupportedLanguage, useAlgoStore } from "@/store/useAlgoStore";

type TopBarProps = {
  analysisOpen: boolean;
  onToggleAnalysis: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
};

const langMeta: Record<string, { ext: string; color: string }> = {
  "C++":        { ext: "cpp",  color: "#4ea1ff" },
  Java:         { ext: "java", color: "#f97316" },
  Python:       { ext: "py",   color: "#facc15" },
  JavaScript:   { ext: "js",   color: "#86efac" },
};

export default function TopBar({
  analysisOpen,
  onToggleAnalysis,
  isFullscreen,
  onToggleFullscreen,
}: TopBarProps) {
  const language = useAlgoStore((state) => state.language);
  const setLanguage = useAlgoStore((state) => state.setLanguage);
  const reviewCode = useAlgoStore((state) => state.reviewCode);
  const resetCode = useAlgoStore((state) => state.resetCode);
  const status = useAlgoStore((state) => state.status);

  const meta = langMeta[language] ?? { ext: "txt", color: "#a1a1aa" };
  const isRunning = status === "running";

  return (
    <header className="flex flex-col border-b border-white/[0.07]">
      {/* ── File tab row ──────────────────────────────────────── */}
      <div className="flex items-end bg-editor-950 px-2 pt-2">
        {/* Active file tab */}
        <div
          className="relative flex items-center gap-2 rounded-t-[8px] border border-b-0 border-white/[0.1] bg-editor-800 px-4 py-2.5"
          style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)" }}
        >
          {/* language colour dot */}
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: meta.color, boxShadow: `0 0 6px ${meta.color}60` }}
          />
          <FileCode2 className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-[13px] font-semibold text-zinc-300">
            solution.{meta.ext}
          </span>
          {/* active indicator line at top */}
          <span
            className="absolute left-0 right-0 top-0 h-[2px] rounded-t-[8px]"
            style={{ background: `linear-gradient(90deg, transparent, ${meta.color}90, transparent)` }}
          />
        </div>
        {/* Inactive tab placeholder */}
        <div className="flex items-center gap-2 rounded-t-[6px] px-4 py-2.5 text-zinc-600 transition hover:bg-white/[0.03] hover:text-zinc-400">
          <span className="text-[12px] font-medium">+</span>
        </div>
      </div>

      {/* ── Main toolbar ──────────────────────────────────────── */}
      <div className="flex h-[58px] shrink-0 items-center justify-between bg-editor-800 px-4 shadow-insetLine">
        {/* Left: language selector */}
        <label className="relative">
          <span className="sr-only">Language</span>
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value as SupportedLanguage)}
            className="h-10 appearance-none rounded-[10px] border border-white/[0.1] bg-editor-900 py-0 pl-4 pr-10 text-[15px] font-semibold text-white outline-none transition hover:border-white/[0.2] focus:border-violet-500/50"
            style={{ minWidth: "120px" }}
          >
            <option>C++</option>
            <option>Java</option>
            <option>Python</option>
            <option>JavaScript</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        </label>

        {/* Center: breadcrumb hint */}
        <div className="hidden items-center gap-1.5 text-[12px] font-medium text-zinc-600 lg:flex">
          <span>workspace</span>
          <span className="text-zinc-700">/</span>
          <span>solution.{meta.ext}</span>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          {/* Analysis toggle */}
          <button
            type="button"
            aria-label="Toggle analysis panel"
            title="Toggle analysis panel"
            onClick={onToggleAnalysis}
            className="hidden h-9 w-9 place-items-center rounded-[10px] border border-white/[0.1] bg-white/[0.04] text-zinc-400 transition hover:border-white/[0.2] hover:bg-white/[0.07] hover:text-white md:grid"
          >
            <PanelBottomClose className={`h-4 w-4 transition ${analysisOpen ? "" : "rotate-180"}`} />
          </button>

          {/* Fullscreen */}
          <button
            type="button"
            aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            onClick={onToggleFullscreen}
            className="grid h-9 w-9 place-items-center rounded-[10px] border border-white/[0.1] bg-white/[0.04] text-zinc-400 transition hover:border-white/[0.2] hover:bg-white/[0.07] hover:text-white"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>

          {/* Reset */}
          <button
            type="button"
            onClick={resetCode}
            className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-white/[0.1] bg-white/[0.04] px-4 text-[13px] font-semibold text-zinc-400 transition hover:border-white/[0.2] hover:bg-white/[0.07] hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>

          {/* Review Code — primary CTA */}
          <button
            type="button"
            onClick={reviewCode}
            disabled={isRunning}
            className="relative inline-flex h-9 items-center gap-2 overflow-hidden rounded-[10px] px-5 text-[13px] font-bold text-white transition disabled:cursor-wait"
            style={{
              background: isRunning
                ? "#374151"
                : "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
              boxShadow: isRunning
                ? "none"
                : "0 0 20px rgba(99,102,241,0.35), 0 2px 8px rgba(0,0,0,0.4)",
            }}
          >
            {/* Shimmer effect when idle */}
            {!isRunning && (
              <span
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.08) 50%, transparent 60%)",
                  backgroundSize: "200% 100%",
                  animation: "shimmer 3s linear infinite",
                }}
              />
            )}
            <BrainCircuit className={`h-4 w-4 ${isRunning ? "status-running" : ""}`} />
            <span>{isRunning ? "Reviewing..." : "Review Code"}</span>
            {!isRunning && (
              <span className="ml-1 rounded-md bg-black/25 px-1.5 py-0.5 text-[10px] font-bold text-white/60">
                ⌃↵
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
