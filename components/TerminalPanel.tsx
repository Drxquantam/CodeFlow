"use client";

import { useState } from "react";
import { BrainCircuit, ChartNoAxesCombined, ShieldCheck, Sparkles, Star, TerminalIcon, Wand2 } from "lucide-react";
import { useAlgoStore } from "@/store/useAlgoStore";
import { formatInputForDisplay } from "@/lib/inputNormalizer";

type PanelTab = "input" | "review";

export default function TerminalPanel() {
  const stdin = useAlgoStore((state) => state.stdin);
  const setStdin = useAlgoStore((state) => state.setStdin);
  const output = useAlgoStore((state) => state.output);
  const runtime = useAlgoStore((state) => state.runtime);
  const memory = useAlgoStore((state) => state.memory);
  const status = useAlgoStore((state) => state.status);
  const review = useAlgoStore((state) => state.lastReview);
  const hasInput = stdin.trim().length > 0;
  const hasReview = Boolean(review);

  const [activeTab, setActiveTab] = useState<PanelTab>("input");

  return (
    <div className="flex h-full min-h-0 flex-col bg-editor-850">
      {/* ── Tab bar header ──────────────────────────────────────── */}
      <div className="flex shrink-0 items-center border-b border-white/[0.07] bg-editor-900 px-4">
        {/* Traffic lights */}
        <div className="flex items-center gap-1.5 pr-4 pt-[2px]">
          <span className="h-3 w-3 rounded-full bg-red-500/80" />
          <span className="h-3 w-3 rounded-full bg-yellow-400/80" />
          <span className="h-3 w-3 rounded-full bg-green-400/80" />
        </div>

        {/* Tabs */}
        {(
          [
            { id: "input" as const, label: "Input", icon: <TerminalIcon className="h-3.5 w-3.5" />, badge: false },
            { id: "review" as const, label: "Review", icon: <BrainCircuit className="h-3.5 w-3.5" />, badge: hasReview },
          ]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex h-[46px] items-center gap-2 px-4 text-[13px] font-semibold transition ${
              activeTab === tab.id
                ? "text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span className={activeTab === tab.id ? "text-violet-400" : ""}>{tab.icon}</span>
            {tab.label}
            {tab.badge && (
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" style={{ boxShadow: "0 0 5px #8b5cf6" }} />
            )}
            {/* Active underline */}
            {activeTab === tab.id && (
              <span
                className="absolute bottom-0 left-0 right-0 h-[2px]"
                style={{ background: "linear-gradient(90deg, transparent, #6366f1, #8b5cf6, transparent)" }}
              />
            )}
          </button>
        ))}

        {/* Right: auto-format button */}
        {activeTab === "input" && (
          <button
            type="button"
            onClick={() => setStdin(formatInputForDisplay(stdin))}
            disabled={!hasInput}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[12px] font-semibold text-zinc-400 transition hover:border-white/[0.15] hover:bg-white/[0.06] hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Wand2 className="h-3.5 w-3.5" />
            Format
          </button>
        )}
      </div>

      {/* ── Panel content ────────────────────────────────────────── */}
      <div className="analysis-scroll flex-1 overflow-auto">
        {activeTab === "input" ? (
          <InputPanel
            stdin={stdin}
            setStdin={setStdin}
            hasInput={hasInput}
            isRunning={status === "running"}
          />
        ) : (
          <ReviewPanel
            review={review}
            output={output}
            runtime={runtime}
            memory={memory}
            isRunning={status === "running"}
          />
        )}
      </div>
    </div>
  );
}

function InputPanel({
  stdin,
  setStdin,
  hasInput,
  isRunning,
}: {
  stdin: string;
  setStdin: (v: string) => void;
  hasInput: boolean;
  isRunning: boolean;
}) {
  return (
    <div className="p-4">
      {/* Prompt line */}
      <div className="mb-3 flex items-center gap-2 font-mono text-[13px]">
        <span className="text-violet-400">❯</span>
        <span className="text-signal-green">stdin</span>
        <span className="text-zinc-600 text-[12px]">
          — paste LeetCode / GFG style input
        </span>
      </div>

      <textarea
        value={stdin}
        onChange={(e) => setStdin(e.target.value)}
        placeholder={`nums = [1, 2, 3]\ntarget = 6`}
        spellCheck={false}
        className="min-h-[140px] w-full resize-y rounded-[10px] border border-white/[0.08] bg-editor-900 p-4 font-mono text-[14px] font-medium leading-7 text-zinc-200 outline-none transition placeholder:text-zinc-700 focus:border-violet-500/35 focus:shadow-glow-xs"
      />

      {hasInput && (
        <div
          className="mt-3 flex items-start gap-2.5 rounded-[10px] border border-violet-500/20 bg-violet-500/6 p-3 text-[13px] leading-6 text-violet-300"
        >
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-400" />
          Input ready. Head to the <strong className="text-violet-200">Dry Run</strong> tab for a step-by-step walkthrough.
        </div>
      )}

      {isRunning && (
        <p className="mt-3 text-[13px] font-medium text-violet-400 status-running">
          ⚡ AI is reviewing your code...
        </p>
      )}
    </div>
  );
}

function ReviewPanel({
  review,
  output,
  runtime,
  memory,
  isRunning,
}: {
  review: unknown;
  output: string;
  runtime: string;
  memory: string;
  isRunning: boolean;
}) {
  if (isRunning) {
    return (
      <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 p-6">
        <BrainCircuit className="h-8 w-8 text-violet-400 status-running" />
        <p className="text-sm font-semibold text-violet-300">Analyzing your code...</p>
        <p className="text-xs text-zinc-600">This takes about 3-6 seconds</p>
      </div>
    );
  }

  if (review) {
    return <ReviewCard runtime={runtime} memory={memory} />;
  }

  if (output) {
    return (
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          <MetricTile icon={<ChartNoAxesCombined className="h-4 w-4 text-signal-blue" />} label="Time" value={runtime} />
          <MetricTile icon={<BrainCircuit className="h-4 w-4 text-signal-green" />} label="Space" value={memory} />
        </div>
        <pre className="min-h-[140px] overflow-auto whitespace-pre-wrap rounded-[10px] border border-white/[0.07] bg-editor-900 p-4 font-mono text-[13px] leading-7 text-zinc-200">
          {output}
        </pre>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full border border-white/[0.07] bg-white/[0.03] text-zinc-600">
        <BrainCircuit className="h-6 w-6" />
      </div>
      <p className="text-[14px] font-semibold text-zinc-500">No review yet</p>
      <p className="max-w-[240px] text-[13px] leading-6 text-zinc-700">
        Click <span className="font-semibold text-zinc-500">Review Code</span> or press{" "}
        <kbd className="rounded border border-white/[0.1] bg-white/[0.05] px-1.5 py-0.5 text-[11px] font-mono text-zinc-400">
          Ctrl+Enter
        </kbd>
      </p>
    </div>
  );
}

function MetricTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[10px] border border-white/[0.07] bg-editor-900 px-4 py-3 text-[13px] text-zinc-400">
      {icon}
      <span className="font-semibold">{label}</span>
      <span className="ml-auto font-bold text-white">{value}</span>
    </div>
  );
}

function ReviewCard({ runtime, memory }: { runtime: string; memory: string }) {
  const review = useAlgoStore((state) => state.lastReview);
  const timeStars = scoreComplexity(runtime);
  const spaceStars = scoreComplexity(memory);
  const typedLines = [
    "review.start()",
    `time.rating = ${timeStars}/5`,
    `space.rating = ${spaceStars}/5`,
    `pattern = "${review?.detectedAlgorithm ?? "unknown"}"`,
  ];

  return (
    <div className="p-4">
      <article
        className="review-card-3d relative overflow-hidden rounded-[14px] border border-white/[0.1] bg-editor-900 p-5"
        style={{
          boxShadow:
            "0 24px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(99,102,241,0.12), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        {/* Background glow blobs */}
        <div className="pointer-events-none absolute inset-0 rounded-[14px]"
          style={{
            background:
              "radial-gradient(circle at 20% 0%, rgba(78,161,255,0.12) 0%, transparent 35%), radial-gradient(circle at 88% 16%, rgba(99,102,241,0.1) 0%, transparent 30%)",
          }}
        />

        <div className="relative">
          {/* Header */}
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400">AI Review</p>
              <h3 className="mt-1.5 text-[18px] font-bold text-white">Complexity Score</h3>
            </div>
            <span
              className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-400"
              style={{ boxShadow: "0 0 10px rgba(52,211,153,0.15)" }}
            >
              ✓ Reviewed
            </span>
          </div>

          {/* Score tiles */}
          <div className="grid gap-2.5 sm:grid-cols-2">
            <ScoreTile
              icon={<ChartNoAxesCombined className="h-4 w-4" />}
              label="Time"
              value={runtime}
              stars={timeStars}
              accent="#4ea1ff"
            />
            <ScoreTile
              icon={<BrainCircuit className="h-4 w-4" />}
              label="Space"
              value={memory}
              stars={spaceStars}
              accent="#a78bfa"
            />
          </div>

          {/* Fake terminal with typewriter */}
          <div className="mt-4 overflow-hidden rounded-[10px] border border-white/[0.08] bg-black">
            <div className="flex h-8 items-center gap-1.5 border-b border-white/[0.07] bg-white/[0.04] px-3">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
              <span className="ml-2 text-[11px] font-semibold text-zinc-600">review.ts</span>
            </div>
            <pre className="min-h-[130px] p-4 font-mono text-[12px] leading-7 text-signal-green">
              <code>
                {typedLines.map((line, i) => (
                  <span
                    key={line}
                    className="review-typewriter-line"
                    style={{ "--line-delay": `${i * 900}ms`, "--line-chars": line.length } as React.CSSProperties}
                  >
                    {line}
                  </span>
                ))}
              </code>
            </pre>
          </div>

          {/* Insights */}
          <div className="mt-4 grid gap-2.5">
            <MiniInsight
              icon={<ShieldCheck className="h-3.5 w-3.5" />}
              title="Correctness"
              text={review?.codeSummary ?? "Review generated successfully."}
            />
            <MiniInsight
              icon={<Sparkles className="h-3.5 w-3.5" />}
              title="Focus Next"
              text={
                review?.review?.bugs?.[0] ??
                review?.review?.edgeCaseRisks?.[0] ??
                "No major issue found. Try a dry run next."
              }
            />
          </div>
        </div>
      </article>
    </div>
  );
}

function ScoreTile({
  icon,
  label,
  value,
  stars,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  stars: number;
  accent: string;
}) {
  return (
    <div className="rounded-[10px] border border-white/[0.07] bg-white/[0.03] p-3.5">
      <div className="mb-2.5 flex items-center gap-2 text-[13px] text-zinc-400">
        <span style={{ color: accent }}>{icon}</span>
        <span className="font-semibold">{label}</span>
        <span className="ml-auto rounded-md bg-black/40 px-2 py-0.5 text-[11px] font-mono text-zinc-500">
          {value}
        </span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${i < stars ? "fill-signal-yellow text-signal-yellow" : "text-zinc-800"}`}
          />
        ))}
      </div>
    </div>
  );
}

function MiniInsight({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-[10px] border border-white/[0.06] bg-black/25 p-3">
      <h4 className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
        {icon}
        {title}
      </h4>
      <p className="line-clamp-3 text-[13px] leading-6 text-zinc-300">{text}</p>
    </div>
  );
}

function scoreComplexity(complexity: string) {
  const n = complexity.toLowerCase().replace(/\s+/g, "");
  if (n.includes("o(1)") || n.includes("logn")) return 5;
  if (n.includes("nlogn")) return 4;
  if (n.includes("o(n)") || n.includes("n+m")) return 4;
  if (n.includes("n^2") || n.includes("n*n")) return 2;
  if (n.includes("2^n") || n.includes("exp")) return 1;
  return 3;
}
