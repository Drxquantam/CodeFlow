"use client";

import { BrainCircuit, ChartNoAxesCombined, ShieldCheck, Sparkles, Star, Wand2 } from "lucide-react";
import { useAlgoStore } from "@/store/useAlgoStore";
import { normalizeInputForVisualizer } from "@/lib/inputNormalizer";

export default function TerminalPanel() {
  const stdin = useAlgoStore((state) => state.stdin);
  const setStdin = useAlgoStore((state) => state.setStdin);
  const output = useAlgoStore((state) => state.output);
  const runtime = useAlgoStore((state) => state.runtime);
  const memory = useAlgoStore((state) => state.memory);
  const status = useAlgoStore((state) => state.status);
  const review = useAlgoStore((state) => state.lastReview);
  const hasInput = stdin.trim().length > 0;

  return (
    <div className="h-full min-h-0 border-b border-white/[0.08] bg-carbon-950">
      <div className="flex h-[52px] items-center gap-4 border-b border-white/[0.11] bg-carbon-850 px-6">
        <span className="h-4 w-4 rounded-full bg-red-500" />
        <span className="h-4 w-4 rounded-full bg-yellow-500" />
        <span className="h-4 w-4 rounded-full bg-green-500" />
        <span className="ml-5 text-xl font-semibold text-zinc-300">Input & Review</span>
      </div>

      <div className="analysis-scroll h-[calc(100%-52px)] overflow-auto">
        <div className="border-b border-white/[0.08] p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xl text-signal-green">
              $ stdin{" "}
              <span className="text-base text-zinc-600">(paste normal input or LeetCode/GFG style)</span>
            </div>
            <button
              type="button"
              onClick={() => setStdin(normalizeInputForVisualizer(stdin))}
              disabled={!hasInput}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-white/[0.1] bg-white/[0.04] px-3 text-sm font-semibold text-zinc-300 transition hover:border-white/25 hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Wand2 className="h-4 w-4" />
              Auto Format
            </button>
          </div>
          <textarea
            value={stdin}
            onChange={(event) => setStdin(event.target.value)}
            placeholder="Enter input here"
            spellCheck={false}
            className="min-h-[128px] w-full resize-y rounded-md border border-white/[0.08] bg-[#151515] p-4 text-xl font-bold leading-8 text-white outline-none transition placeholder:text-zinc-700 focus:border-white/20"
          />
          {hasInput ? (
            <p className="mt-3 rounded-md border border-signal-blue/20 bg-signal-blue/10 p-3 text-sm leading-6 text-signal-blue">
              Auto Format converts structured examples into clean stdin. For graphs, the first line becomes <span className="font-mono">V E S</span>, followed by one weighted edge per line.
            </p>
          ) : null}
        </div>

        <div className="p-5">
          {review ? (
            <ReviewCard runtime={runtime} memory={memory} />
          ) : output ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 rounded-md border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-zinc-300">
                  <ChartNoAxesCombined className="h-5 w-5 text-signal-blue" />
                  Time <span className="ml-auto font-bold text-white">{runtime}</span>
                </div>
                <div className="flex items-center gap-3 rounded-md border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-zinc-300">
                  <BrainCircuit className="h-5 w-5 text-signal-green" />
                  Space <span className="ml-auto font-bold text-white">{memory}</span>
                </div>
              </div>
              <pre className="min-h-[150px] whitespace-pre-wrap rounded-md border border-white/[0.08] bg-black p-4 text-base leading-7 text-zinc-200">
                {output}
              </pre>
            </div>
          ) : (
            <p className="text-lg text-zinc-600">
              Click &quot;Review Code&quot; or press Ctrl+Enter to analyze correctness and complexity.
            </p>
          )}
          {status === "running" ? (
            <p className="mt-4 text-sm text-signal-yellow">AI review is reading your code...</p>
          ) : null}
        </div>
      </div>
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
    `TLE.risk = "${review?.tleRisk ?? "medium"}"`,
  ];

  return (
    <article className="review-card-3d relative overflow-hidden rounded-xl border border-white/[0.12] bg-[#0d0d0f] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.55)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(78,161,255,0.18),transparent_34%),radial-gradient(circle_at_90%_18%,rgba(34,197,94,0.14),transparent_30%)]" />
      <div className="relative">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-signal-blue">
              AI Review Card
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Complexity Score</h3>
          </div>
          <div className="rounded-full border border-signal-green/30 bg-signal-green/10 px-3 py-1 text-sm font-bold text-signal-green">
            AI reviewed
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <ScoreTile
            icon={<ChartNoAxesCombined className="h-5 w-5" />}
            label="Time"
            value={runtime}
            stars={timeStars}
          />
          <ScoreTile
            icon={<BrainCircuit className="h-5 w-5" />}
            label="Space"
            value={memory}
            stars={spaceStars}
          />
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-white/[0.1] bg-black">
          <div className="flex h-9 items-center gap-2 border-b border-white/[0.08] bg-white/[0.06] px-3">
            <span className="h-3 w-3 rounded-full bg-red-500" />
            <span className="h-3 w-3 rounded-full bg-yellow-500" />
            <span className="h-3 w-3 rounded-full bg-green-500" />
            <span className="ml-2 text-xs font-semibold text-zinc-500">review.ts</span>
          </div>
          <pre className="min-h-[150px] p-4 font-mono text-sm leading-7 text-signal-green">
            <code>
              {typedLines.map((line, index) => (
                <span
                  key={line}
                  className="review-typewriter-line"
                  style={
                    {
                      "--line-delay": `${index * 900}ms`,
                      "--line-chars": line.length,
                    } as React.CSSProperties
                  }
                >
                  {line}
                </span>
              ))}
            </code>
          </pre>
        </div>

        <div className="mt-4 grid gap-3">
          <MiniInsight
            icon={<ShieldCheck className="h-4 w-4" />}
            title="Correctness"
            text={review?.approach ?? "Review generated successfully."}
          />
          <MiniInsight
            icon={<Sparkles className="h-4 w-4" />}
            title="Focus Next"
            text={review?.mistakes?.[0] ?? review?.edgeCases?.[0] ?? "No major issue found. Try generating a dry run or visual trace next."}
          />
        </div>
      </div>
    </article>
  );
}

function ScoreTile({
  icon,
  label,
  value,
  stars,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  stars: number;
}) {
  return (
    <div className="rounded-lg border border-white/[0.09] bg-white/[0.045] p-4">
      <div className="mb-3 flex items-center gap-2 text-zinc-300">
        <span className="text-signal-blue">{icon}</span>
        <span className="font-semibold">{label}</span>
        <span className="ml-auto rounded-full bg-black/40 px-2 py-1 text-xs text-zinc-400">{value}</span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: 5 }, (_, index) => (
          <Star
            key={index}
            className={`h-5 w-5 ${index < stars ? "fill-signal-yellow text-signal-yellow" : "text-zinc-700"}`}
          />
        ))}
      </div>
    </div>
  );
}

function MiniInsight({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-black/30 p-3">
      <h4 className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">
        {icon}
        {title}
      </h4>
      <p className="line-clamp-4 text-sm leading-6 text-zinc-300">{text}</p>
    </div>
  );
}

function scoreComplexity(complexity: string) {
  const normalized = complexity.toLowerCase().replace(/\s+/g, "");
  if (normalized.includes("o(1)") || normalized.includes("logn")) return 5;
  if (normalized.includes("nlogn")) return 4;
  if (normalized.includes("o(n)") || normalized.includes("n+m")) return 4;
  if (normalized.includes("n^2") || normalized.includes("n*n")) return 2;
  if (normalized.includes("2^n") || normalized.includes("exp")) return 1;
  return 3;
}
