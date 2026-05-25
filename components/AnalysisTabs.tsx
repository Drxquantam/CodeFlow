"use client";

import { AlertTriangle, CheckCircle2, ClipboardList, FileSearch, Gauge, Lightbulb, MessageSquare, Send, Table2 } from "lucide-react";
import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAlgoStore } from "@/store/useAlgoStore";
import type { CodeFlowAnalysisResult } from "@/types/codeflowAnalysis";

const tabs = ["Review", "Analyze", "Dry Run", "Test Cases"] as const;
type TabName = (typeof tabs)[number];

export default function AnalysisTabs() {
  const [active, setActive] = useState<TabName>("Analyze");
  const code = useAlgoStore((state) => state.code);
  const language = useAlgoStore((state) => state.language);
  const stdin = useAlgoStore((state) => state.stdin);
  const setStdin = useAlgoStore((state) => state.setStdin);
  const [result, setResult] = useState<CodeFlowAnalysisResult | null>(null);
  const [analysisKey, setAnalysisKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const currentKey = `${language}\n${stdin}\n${code}`;
  const visibleResult = analysisKey === currentKey ? result : null;

  const runAnalysis = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language, stdin }),
      });
      const payload = (await response.json()) as CodeFlowAnalysisResult & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Analysis failed.");
      }

      setResult(payload);
      setAnalysisKey(currentKey);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Analysis failed.");
    } finally {
      setLoading(false);
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
        <button
          type="button"
          onClick={runAnalysis}
          disabled={loading || !code.trim()}
          className="ml-auto h-9 rounded-md bg-white px-4 text-sm font-bold text-black transition hover:bg-zinc-200 disabled:cursor-wait disabled:bg-zinc-500"
        >
          {loading ? "Analyzing..." : "Analyze Code"}
        </button>
      </div>

      <div className="analysis-scroll max-h-[78vh] min-h-[640px] overflow-auto p-4">
        {error ? (
          <p className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        {active === "Review" ? <ReviewTab result={visibleResult} /> : null}
        {active === "Analyze" ? <AnalyzeTab result={visibleResult} /> : null}
        {active === "Dry Run" ? (
          <DryRunTab
            result={visibleResult}
            code={code}
            stdin={stdin}
            setStdin={setStdin}
            onAnalyze={runAnalysis}
            loading={loading}
          />
        ) : null}
        {active === "Test Cases" ? <TestCasesTab result={visibleResult} /> : null}
      </div>
    </div>
  );
}

function ReviewTab({ result }: { result: CodeFlowAnalysisResult | null }) {
  if (!result) {
    return <EmptyState text="Paste code and click Analyze to get a review." />;
  }

  const review = result.review;

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
      <div className="space-y-4">
        <Section title="Bug Detection" icon={<AlertTriangle className="h-4 w-4" />}>
          <BulletList items={review?.bugs} empty="No obvious bugs were reported." />
        </Section>
        <Section title="Code Quality" icon={<FileSearch className="h-4 w-4" />}>
          <BulletList items={review?.qualitySuggestions} empty="No specific quality suggestions were reported." />
        </Section>
        <Section title="Edge Case Risks" icon={<ClipboardList className="h-4 w-4" />}>
          <BulletList items={review?.edgeCaseRisks} empty="No edge case risks were reported." />
        </Section>
      </div>

      <div className="space-y-4">
        <ScoreGrid scores={review?.scores} />
        <Section title="Improved Code" icon={<CheckCircle2 className="h-4 w-4" />}>
          {review?.improvedCode?.trim() ? (
            <pre className="max-h-[520px] overflow-auto rounded-md bg-black p-3 font-mono text-xs leading-5 text-zinc-300">
              {review.improvedCode}
            </pre>
          ) : (
            <p className="text-sm leading-6 text-zinc-500">No rewrite needed or no improved version was returned.</p>
          )}
        </Section>
      </div>
    </div>
  );
}

function AnalyzeTab({ result }: { result: CodeFlowAnalysisResult | null }) {
  if (!result) {
    return <EmptyState text="Paste code to understand algorithm and complexity." />;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Section title="Code Summary" icon={<FileSearch className="h-4 w-4" />}>
        <p className="text-sm leading-6 text-zinc-300">{result.codeSummary || "No summary returned."}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip label={result.language || "language unknown"} />
          <Chip label={result.detectedAlgorithm || "pattern unknown"} />
        </div>
      </Section>

      <Section title="Algorithm / Pattern Detected" icon={<Lightbulb className="h-4 w-4" />}>
        <p className="text-2xl font-bold text-white">{result.detectedAlgorithm || "Unknown"}</p>
      </Section>

      <Section title="Step-by-Step Approach" icon={<ClipboardList className="h-4 w-4" />}>
        <NumberedList items={result.analysis?.approach} empty="No approach steps returned." />
      </Section>

      <Section title="Complexity" icon={<Gauge className="h-4 w-4" />}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Best" value={result.analysis?.timeComplexity.best || "-"} />
          <Metric label="Average" value={result.analysis?.timeComplexity.average || "-"} />
          <Metric label="Worst" value={result.analysis?.timeComplexity.worst || "-"} />
        </div>
        <p className="mt-3 text-sm leading-6 text-zinc-500">{result.analysis?.timeComplexity.explanation || "No time complexity explanation returned."}</p>
        <div className="mt-4 rounded-md border border-white/[0.08] bg-black/35 p-3">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Space Complexity</p>
          <p className="mt-2 text-lg font-bold text-white">{result.analysis?.spaceComplexity.value || "-"}</p>
          <p className="mt-1 text-sm leading-6 text-zinc-500">{result.analysis?.spaceComplexity.explanation || "No space explanation returned."}</p>
        </div>
      </Section>

      <ComplexityCurve result={result} />

      <Section title="Better Approach" icon={<CheckCircle2 className="h-4 w-4" />}>
        <p className="text-sm leading-6 text-zinc-300">{result.analysis?.betterApproach || "No better approach suggestion returned."}</p>
      </Section>

      <Section title="Interview Explanation" icon={<Lightbulb className="h-4 w-4" />}>
        <p className="text-sm leading-6 text-zinc-300">{result.analysis?.interviewExplanation || "No interview explanation returned."}</p>
      </Section>
    </div>
  );
}

function DryRunTab({
  result,
  code,
  stdin,
  setStdin,
  onAnalyze,
  loading,
}: {
  result: CodeFlowAnalysisResult | null;
  code: string;
  stdin: string;
  setStdin: (value: string) => void;
  onAnalyze: () => void;
  loading: boolean;
}) {
  const dryRun = result?.dryRun;

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-white/[0.08] bg-[#111] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-400">Input</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-500">Paste custom input, then analyze again to generate a step-by-step dry run.</p>
          </div>
          <button
            type="button"
            onClick={onAnalyze}
            disabled={loading}
            className="rounded-md bg-white px-4 py-2 text-sm font-bold text-black transition hover:bg-zinc-200 disabled:cursor-wait disabled:bg-zinc-500"
          >
            {loading ? "Generating..." : "Generate Dry Run"}
          </button>
        </div>
        <textarea
          value={stdin}
          onChange={(event) => setStdin(event.target.value)}
          placeholder="Enter input here..."
          className="mt-4 min-h-32 w-full resize-y rounded-md border border-white/[0.1] bg-black/40 p-3 font-mono text-sm leading-6 text-zinc-200 outline-none"
        />
      </div>

      {!result ? <EmptyState text="Paste code and input to generate a step-by-step dry run." /> : null}

      {dryRun?.warnings?.length ? (
        <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-100">
          {dryRun.warnings.join(" ")}
        </div>
      ) : null}

      {dryRun && dryRun.rows.length > 0 ? (
        <div className="overflow-auto rounded-md border border-white/[0.08] bg-[#111]">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.16em] text-zinc-500">
              <tr>
                {dryRun.columns.map((column) => (
                  <th key={column} className="px-3 py-3">{column}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {dryRun.rows.map((row, index) => (
                <tr key={`${index}-${JSON.stringify(row)}`} className="text-zinc-300 transition hover:bg-white/[0.035]">
                  {dryRun.columns.map((column) => (
                    <td key={column} className="px-3 py-3 align-top">
                      <CellValue column={column} value={row[column] ?? "-"} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : result ? (
        <EmptyState text="No dry-run rows returned. Add input and analyze again." />
      ) : null}

      {dryRun ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <StateSummary dryRun={dryRun} />
          <Section title="Variable Watch" icon={<Gauge className="h-4 w-4" />}>
            {dryRun.variableWatch?.length ? (
              <div className="space-y-2">
                {dryRun.variableWatch.map((item) => (
                  <pre key={item.step} className="rounded-md bg-black/45 p-3 font-mono text-xs leading-5 text-zinc-300">
                    Step {item.step}: {formatVariables(item.variables)}
                  </pre>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No variable watch returned.</p>
            )}
          </Section>
          <Section title="State Snapshots" icon={<Table2 className="h-4 w-4" />}>
            {dryRun.snapshots?.length ? (
              <div className="space-y-3">
                {dryRun.snapshots.map((snapshot) => (
                  <div key={`${snapshot.step}-${snapshot.title}`} className="rounded-md border border-white/[0.08] bg-black/35 p-3">
                    <p className="font-semibold text-white">Step {snapshot.step}: {snapshot.title}</p>
                    <p className="mt-1 text-sm leading-6 text-zinc-500">{snapshot.description}</p>
                    {snapshot.variables ? <p className="mt-2 font-mono text-xs text-signal-green">{formatVariables(snapshot.variables)}</p> : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No snapshots returned.</p>
            )}
          </Section>
          <Section title="Output Prediction" icon={<CheckCircle2 className="h-4 w-4" />}>
            <pre className="rounded-md bg-black/45 p-3 font-mono text-sm leading-6 text-zinc-300">{dryRun.finalOutput || "No final output returned."}</pre>
          </Section>
        </div>
      ) : null}

      {result ? <DryRunChat result={result} code={code} stdin={stdin} /> : null}
    </div>
  );
}

function TestCasesTab({ result }: { result: CodeFlowAnalysisResult | null }) {
  if (!result) {
    return <EmptyState text="Paste code to generate sample, edge, and hidden test cases." />;
  }

  const cases = result.testCases ?? [];
  if (!cases.length) {
    return <EmptyState text="No test cases were returned. Analyze again with more code context." />;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {cases.map((testCase) => (
        <div key={`${testCase.type}-${testCase.title}`} className="rounded-md border border-white/[0.08] bg-[#111] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-white">{testCase.title}</h3>
            <Chip label={testCase.type} />
          </div>
          <p className="mb-3 text-sm leading-6 text-zinc-500">{testCase.explanation}</p>
          <div className="grid gap-3 md:grid-cols-2">
            <pre className="rounded-md bg-black/45 p-3 font-mono text-xs leading-5 text-zinc-300">{testCase.input}</pre>
            <pre className="rounded-md bg-black/45 p-3 font-mono text-xs leading-5 text-signal-green">{testCase.expectedOutput || "Expected output not safely inferable."}</pre>
          </div>
        </div>
      ))}
    </div>
  );
}

function ComplexityCurve({ result }: { result: CodeFlowAnalysisResult }) {
  const worst = result.analysis?.timeComplexity.worst ?? "";
  const curve = buildComplexityCurve(worst);

  return (
    <section className="rounded-md border border-white/[0.08] bg-[#111] p-4 xl:col-span-2">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-zinc-400">
            <Gauge className="h-4 w-4" />
            Time Complexity Curve
          </h3>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Growth preview for {worst || "unknown complexity"} across increasing input size.
          </p>
        </div>
        <Chip label={curve.label} />
      </div>
      <div className="h-[280px] rounded-md border border-white/[0.08] bg-black/35 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={curve.points} margin={{ left: 8, right: 16, top: 12, bottom: 8 }}>
            <CartesianGrid stroke="#27272a" strokeDasharray="4 4" />
            <XAxis dataKey="n" stroke="#a1a1aa" tick={{ fontSize: 12 }} />
            <YAxis stroke="#a1a1aa" tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{ background: "#09090b", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8 }}
              labelStyle={{ color: "#f4f4f5" }}
            />
            <Line type="monotone" dataKey="operations" stroke="#4ea1ff" strokeWidth={3} dot={{ r: 4, fill: "#4ea1ff" }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function StateSummary({ dryRun }: { dryRun: NonNullable<CodeFlowAnalysisResult["dryRun"]> }) {
  const latestWatch = dryRun.variableWatch?.at(-1);
  const latestSnapshot = dryRun.snapshots?.at(-1);

  return (
    <Section title="Current State Focus" icon={<Table2 className="h-4 w-4" />}>
      <div className="space-y-3">
        {latestSnapshot ? (
          <div className="rounded-md border border-signal-blue/20 bg-signal-blue/10 p-3">
            <p className="font-semibold text-white">Step {latestSnapshot.step}: {latestSnapshot.title}</p>
            <p className="mt-1 text-sm leading-6 text-zinc-300">{latestSnapshot.description}</p>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">No focused snapshot returned.</p>
        )}
        {latestWatch?.variables ? (
          <div className="flex flex-wrap gap-2">
            {Object.entries(latestWatch.variables).map(([key, value]) => (
              <span key={key} className="rounded-full border border-white/[0.1] bg-black/45 px-3 py-1.5 font-mono text-xs text-zinc-200">
                {key}={value}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </Section>
  );
}

function CellValue({ column, value }: { column: string; value: string }) {
  const lower = column.toLowerCase();
  if (lower.includes("array") || lower.includes("state") || lower.includes("queue") || lower.includes("stack")) {
    return <span className="font-mono text-signal-green">{value}</span>;
  }
  if (lower.includes("condition")) {
    return <span className="font-mono text-signal-yellow">{value}</span>;
  }
  if (lower.includes("action")) {
    return <span className="text-white">{value}</span>;
  }
  return <span>{value}</span>;
}

function DryRunChat({
  result,
  code,
  stdin,
}: {
  result: CodeFlowAnalysisResult;
  code: string;
  stdin: string;
}) {
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);

  const askQuestion = async () => {
    if (!question.trim()) return;
    const currentQuestion = question.trim();
    setMessages((current) => [...current, { role: "user", text: currentQuestion }]);
    setQuestion("");
    setLoading(true);

    try {
      const response = await fetch("/api/dry-run-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: currentQuestion, analysis: result, code, stdin }),
      });
      const payload = (await response.json()) as { answer?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Chat failed.");
      setMessages((current) => [...current, { role: "assistant", text: payload.answer ?? "I could not answer that from the current dry run." }]);
    } catch (caught) {
      setMessages((current) => [...current, { role: "assistant", text: caught instanceof Error ? caught.message : "Chat failed." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-md border border-white/[0.08] bg-[#111] p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-zinc-400">
        <MessageSquare className="h-4 w-4" />
        Ask About This Dry Run
      </h3>
      <div className="mb-3 max-h-72 space-y-2 overflow-auto rounded-md border border-white/[0.08] bg-black/35 p-3">
        {messages.length ? messages.map((message, index) => (
          <div
            key={`${message.role}-${index}-${message.text}`}
            className={`rounded-md p-3 text-sm leading-6 ${
              message.role === "user" ? "ml-auto max-w-[85%] bg-white text-black" : "mr-auto max-w-[85%] bg-white/[0.06] text-zinc-200"
            }`}
          >
            {message.text}
          </div>
        )) : (
          <p className="text-sm text-zinc-500">Ask why a condition is true, why a variable changes, or what hidden case may fail.</p>
        )}
      </div>
      <div className="flex gap-2">
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void askQuestion();
            }
          }}
          placeholder="Why did this step happen?"
          className="h-10 min-w-0 flex-1 rounded-md border border-white/[0.1] bg-black/40 px-3 text-sm text-zinc-200 outline-none"
        />
        <button
          type="button"
          onClick={() => void askQuestion()}
          disabled={loading || !question.trim()}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-white px-4 text-sm font-bold text-black disabled:cursor-wait disabled:bg-zinc-500"
        >
          <Send className="h-4 w-4" />
          {loading ? "Asking" : "Ask"}
        </button>
      </div>
    </section>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-white/[0.08] bg-[#111] p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-zinc-400">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed border-white/[0.12] bg-[#111] p-8 text-center text-sm leading-6 text-zinc-500">
      {text}
    </div>
  );
}

function BulletList({ items, empty }: { items?: string[]; empty: string }) {
  if (!items?.length) {
    return <p className="text-sm leading-6 text-zinc-500">{empty}</p>;
  }

  return (
    <ul className="space-y-2 text-sm leading-6 text-zinc-300">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-signal-blue" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function NumberedList({ items, empty }: { items?: string[]; empty: string }) {
  if (!items?.length) {
    return <p className="text-sm leading-6 text-zinc-500">{empty}</p>;
  }

  return (
    <ol className="space-y-2 text-sm leading-6 text-zinc-300">
      {items.map((item, index) => (
        <li key={item} className="flex gap-3">
          <span className="font-mono text-signal-blue">{index + 1}.</span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

function ScoreGrid({ scores }: { scores?: NonNullable<CodeFlowAnalysisResult["review"]>["scores"] }) {
  const items = [
    ["Correctness", scores?.correctness],
    ["Readability", scores?.readability],
    ["Efficiency", scores?.efficiency],
    ["Interview", scores?.interviewReadiness],
  ] as const;

  return (
    <section className="rounded-md border border-white/[0.08] bg-[#111] p-4">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.16em] text-zinc-400">Review Score</h3>
      <div className="grid grid-cols-2 gap-3">
        {items.map(([label, value]) => (
          <div key={label} className="rounded-md border border-white/[0.08] bg-black/35 p-3">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">{label}</p>
            <p className="mt-2 text-2xl font-bold text-white">{value ?? "-"}/10</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/[0.08] bg-black/35 p-3">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">{label}</p>
      <p className="mt-2 text-lg font-bold text-white">{value}</p>
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1 text-xs font-bold text-zinc-300">
      {label}
    </span>
  );
}

function formatVariables(variables: Record<string, string>) {
  return Object.entries(variables)
    .map(([key, value]) => `${key}=${value}`)
    .join(", ");
}

function buildComplexityCurve(complexity: string) {
  const normalized = complexity.toLowerCase().replace(/\s+/g, "");
  const inputs = [10, 25, 50, 75, 100, 150, 200];
  const calculator = normalized.includes("n^2") || normalized.includes("n2")
    ? (n: number) => n * n
    : normalized.includes("nlogn")
      ? (n: number) => n * Math.log2(n)
      : normalized.includes("logn")
        ? (n: number) => Math.log2(n)
        : normalized.includes("2^n")
          ? (n: number) => Math.pow(2, Math.min(n / 10, 20))
          : normalized.includes("n")
            ? (n: number) => n
            : () => 1;

  const raw = inputs.map((n) => ({ n, value: calculator(n) }));
  const max = Math.max(...raw.map((point) => point.value), 1);

  return {
    label: normalized.includes("n^2") || normalized.includes("n2")
      ? "quadratic"
      : normalized.includes("nlogn")
        ? "linearithmic"
        : normalized.includes("logn")
          ? "logarithmic"
          : normalized.includes("2^n")
            ? "exponential"
            : normalized.includes("n")
              ? "linear"
              : "constant",
    points: raw.map((point) => ({
      n: point.n,
      operations: Math.round((point.value / max) * 100),
    })),
  };
}
