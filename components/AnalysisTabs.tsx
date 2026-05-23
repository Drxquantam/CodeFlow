"use client";

import { AlertTriangle, CheckCircle2, Eye, Timer, Variable } from "lucide-react";
import { useState } from "react";
import ComplexityPanel from "./ComplexityPanel";
import DryRunTable from "./DryRunTable";
import GraphVisualizer from "./GraphVisualizer";
import RuntimeGraph from "./RuntimeGraph";
import SubmissionHistory from "./SubmissionHistory";
import { useAlgoStore } from "@/store/useAlgoStore";
import type { TraceResponse } from "@/app/api/trace/route";

const tabs = ["Review", "Analyze", "Dry Run", "Visualize", "History"];
const variables = ["i", "j", "ans", "queue", "visited", "distance"];

type GroqAnalysis = {
  approach?: string;
  timeComplexity?: string;
  timeExplanation?: string;
  spaceComplexity?: string;
  spaceBreakdown?: Array<{ name: string; complexity: string; reason: string }>;
  tleRisk?: "low" | "medium" | "high";
  tleExplanation?: string;
  mistakes?: string[];
  edgeCases?: string[];
  testIdeas?: string[];
  confidence?: number;
};

export default function AnalysisTabs() {
  const [active, setActive] = useState("Analyze");
  const [selectedVars, setSelectedVars] = useState(["i", "queue", "distance"]);
  const code = useAlgoStore((state) => state.code);
  const language = useAlgoStore((state) => state.language);
  const stdin = useAlgoStore((state) => state.stdin);
  const [trace, setTrace] = useState<TraceResponse | null>(null);
  const [traceKey, setTraceKey] = useState("");
  const [traceLoading, setTraceLoading] = useState(false);
  const [traceError, setTraceError] = useState("");
  const currentTraceKey = `${language}\n${stdin}\n${code}`;
  const visibleTrace = traceKey === currentTraceKey ? trace : null;

  const toggleVar = (name: string) => {
    setSelectedVars((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name],
    );
  };

  const generateTrace = async () => {
    setTraceLoading(true);
    setTraceError("");

    try {
      const response = await fetch("/api/trace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language, stdin }),
      });
      const result = (await response.json()) as TraceResponse & { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Trace generation failed.");
      }

      setTrace(result);
      setTraceKey(currentTraceKey);
    } catch (error) {
      setTraceError(error instanceof Error ? error.message : "Trace generation failed.");
    } finally {
      setTraceLoading(false);
    }
  };

  return (
    <div className="min-h-[270px] bg-carbon-900">
      <div className="analysis-scroll flex gap-1 overflow-x-auto border-b border-white/[0.08] bg-carbon-850 px-3 py-2">
        {tabs.map((tab) => (
          <button
            type="button"
            key={tab}
            onClick={() => setActive(tab)}
            className={`h-9 whitespace-nowrap rounded-md px-3 text-sm font-semibold transition ${
              active === tab
                ? "bg-white text-black"
                : "bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08] hover:text-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="analysis-scroll max-h-[78vh] min-h-[640px] overflow-auto p-4">
        {active === "Review" ? <RunOverview selectedVars={selectedVars} toggleVar={toggleVar} /> : null}
        {active === "Analyze" ? <AnalyzePanel /> : null}
        {active === "Dry Run" ? (
          <DryRunTable
            trace={visibleTrace}
            loading={traceLoading}
            error={traceError}
            onGenerate={generateTrace}
          />
        ) : null}
        {active === "Visualize" ? (
          <GraphVisualizer
            trace={visibleTrace}
            loading={traceLoading}
            error={traceError}
            onGenerate={generateTrace}
            stdin={stdin}
            code={code}
          />
        ) : null}
        {active === "History" ? <SubmissionHistory /> : null}
      </div>
    </div>
  );
}

function AnalyzePanel() {
  const code = useAlgoStore((state) => state.code);
  const language = useAlgoStore((state) => state.language);
  const stdin = useAlgoStore((state) => state.stdin);
  const [analysis, setAnalysis] = useState<GroqAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const runAnalysis = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language, stdin }),
      });
      const result = (await response.json()) as GroqAnalysis & { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Analysis failed.");
      }

      setAnalysis(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-4 2xl:grid-cols-[1fr_1fr]">
      <div className="space-y-4">
        <div className="rounded-md border border-white/[0.08] bg-[#111] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-400">
                Groq AI Analysis
              </h3>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Uses your server-side Groq API key to review the current editor code.
              </p>
            </div>
            <button
              type="button"
              onClick={runAnalysis}
              disabled={loading}
              className="rounded-md bg-white px-4 py-2 text-sm font-bold text-black transition hover:bg-zinc-200 disabled:cursor-wait disabled:bg-zinc-500"
            >
              {loading ? "Analyzing..." : "Analyze Code"}
            </button>
          </div>
          {error ? (
            <p className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </p>
          ) : null}
        </div>

        <ComplexityPanel analysis={analysis} />
      </div>
      <div className="space-y-4">
        <RuntimeGraph complexity={analysis?.timeComplexity} />
        <Insight title="Code-to-Approach Summary" icon={<Eye className="h-4 w-4" />}>
          {analysis?.approach ?? "Run Groq analysis to generate a real approach summary for the current code."}
        </Insight>
        <Insight title="Why TLE? Explainer" icon={<Timer className="h-4 w-4" />}>
          {analysis?.tleExplanation ?? "Run Groq analysis to estimate TLE risk from loops, constraints, and data structures."}
        </Insight>
        <Insight title="Edge Cases" icon={<AlertTriangle className="h-4 w-4" />}>
          {analysis?.edgeCases?.length
            ? analysis.edgeCases.join(" · ")
            : "Run analysis to generate edge cases from your code."}
        </Insight>
      </div>
    </div>
  );
}

function RunOverview({
  selectedVars,
  toggleVar,
}: {
  selectedVars: string[];
  toggleVar: (name: string) => void;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="rounded-md border border-white/[0.08] bg-[#111] p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-zinc-400">
          <Variable className="h-4 w-4" /> Variable Watch
        </h3>
        <div className="flex flex-wrap gap-2">
          {variables.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => toggleVar(name)}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                selectedVars.includes(name)
                  ? "border-signal-blue bg-signal-blue/15 text-white"
                  : "border-white/[0.1] bg-white/[0.03] text-zinc-500"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
        <pre className="mt-4 rounded-md bg-black p-3 text-sm leading-6 text-zinc-300">
          {selectedVars.map((name) => `${name}: ${mockVarValue(name)}`).join("\n")}
        </pre>
      </div>

      <div className="space-y-3">
        <Insight title="State Snapshot Debugging" icon={<CheckCircle2 className="h-4 w-4" />}>
          Snapshot 04 captured queue=[(1,1),(0,2)], distance[1][1]=2, visited count=8.
        </Insight>
        <Insight title="Anti-Cheat Learning Mode" icon={<AlertTriangle className="h-4 w-4" />}>
          Hints reveal one invariant at a time until you explain why BFS guarantees shortest paths.
        </Insight>
        <Insight title="Hidden Test Failure Explanation" icon={<AlertTriangle className="h-4 w-4" />}>
          Fails when all cells are blocked unless the queue-empty output convention is handled.
        </Insight>
      </div>
    </div>
  );
}

function Insight({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-white/[0.08] bg-[#111] p-4">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-zinc-400">
        {icon}
        {title}
      </h3>
      <p className="text-sm leading-6 text-zinc-500">{children}</p>
    </div>
  );
}

function mockVarValue(name: string) {
  const values: Record<string, string> = {
    i: "2",
    j: "1",
    ans: "[0,1,2,3]",
    queue: "[(1,2),(2,1)]",
    visited: "14/16",
    distance: "matrix<4x4>",
  };
  return values[name] ?? "tracked";
}
