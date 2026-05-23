"use client";

import { BrainCircuit, ChevronDown, Maximize2, Minimize2, PanelBottomClose, RotateCcw } from "lucide-react";
import { SupportedLanguage, useAlgoStore } from "@/store/useAlgoStore";

type TopBarProps = {
  analysisOpen: boolean;
  onToggleAnalysis: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
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

  return (
    <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-white/[0.07] bg-carbon-850 px-6 shadow-insetLine">
      <label className="relative w-[282px] max-w-[52vw]">
        <span className="sr-only">Language</span>
        <select
          value={language}
          onChange={(event) => setLanguage(event.target.value as SupportedLanguage)}
          className="h-12 w-full appearance-none rounded-[16px] border border-white/[0.12] bg-[#151515] px-4 pr-11 text-[22px] font-semibold text-white outline-none transition focus:border-white/30"
        >
          <option>C++</option>
          <option>Java</option>
          <option>Python</option>
          <option>JavaScript</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Toggle analysis drawer"
          title="Toggle analysis drawer"
          onClick={onToggleAnalysis}
          className="hidden h-11 w-11 place-items-center rounded-[15px] border border-white/[0.12] bg-white/[0.04] text-zinc-300 transition hover:border-white/25 hover:text-white md:grid"
        >
          <PanelBottomClose
            className={`h-5 w-5 transition ${analysisOpen ? "" : "rotate-180"}`}
          />
        </button>
        <button
          type="button"
          aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          onClick={onToggleFullscreen}
          className="grid h-11 w-11 place-items-center rounded-[15px] border border-white/[0.12] bg-white/[0.04] text-zinc-300 transition hover:border-white/25 hover:text-white"
        >
          {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
        </button>
        <button
          type="button"
          onClick={resetCode}
          className="inline-flex h-11 items-center gap-3 rounded-[15px] border border-white/[0.12] bg-white/[0.05] px-5 text-lg font-semibold text-zinc-300 transition hover:border-white/25 hover:text-white"
        >
          <RotateCcw className="h-5 w-5" />
          Reset
        </button>
        <button
          type="button"
          onClick={reviewCode}
          disabled={status === "running"}
          className="inline-flex h-11 items-center gap-3 rounded-[12px] bg-white px-6 text-lg font-bold text-black transition hover:bg-zinc-200 disabled:cursor-wait disabled:bg-zinc-400"
        >
          <BrainCircuit className="h-5 w-5" />
          {status === "running" ? "Reviewing" : "Review Code"}
        </button>
      </div>
    </header>
  );
}
