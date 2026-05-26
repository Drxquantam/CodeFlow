"use client";

import { AlertTriangle, Check, CheckCircle2, ClipboardList, Clock3, Cpu, FileSearch, Gauge, Lightbulb, MessageSquare, Send } from "lucide-react";
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
        {active === "Analyze" ? (
          <button
            type="button"
            onClick={runAnalysis}
            disabled={loading || !code.trim()}
            className="ml-auto h-9 rounded-md bg-white px-4 text-sm font-bold text-black transition hover:bg-zinc-200 disabled:cursor-wait disabled:bg-zinc-500"
          >
            {loading ? "Analyzing..." : "Analyze Code"}
          </button>
        ) : null}
      </div>

      <div className="analysis-scroll max-h-[78vh] min-h-[540px] overflow-auto p-4">
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
    <div className="space-y-4">
      <AnalyzeVerdict result={result} />
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <ApproachReview result={result} />
        <PerformancePanel result={result} />
      </div>
      <ComplexityCurve result={result} />
      <ComplexityReasoning result={result} />
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
  const detectedPattern = result?.detectedPattern || "not generated yet";
  const inputUsed = result?.inputUsed || dryRun?.input || stdin;
  const hiddenRisks = result?.hiddenTestRisks ?? [];
  const [sampleAssumed, setSampleAssumed] = useState(false);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <InfoCard label="Pattern Detected" value={prettyPattern(detectedPattern)} />
        <InfoCard label="Dry Run Confidence" value={dryRun?.confidence || "Not generated yet"} />
        <InfoCard label="Input Used" value={inputUsed.trim() || "Input is required for a reliable dry run."} mono compact />
      </div>

      <div className="rounded-md border border-white/[0.08] bg-[#111] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-400">Input</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-500">Dry run needs input. Paste LeetCode/GFG-style input, then generate again.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setStdin(sampleInputForPattern(result?.detectedPattern));
                setSampleAssumed(true);
              }}
              className="rounded-md border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-sm font-bold text-zinc-200 transition hover:border-white/25 hover:bg-white/[0.08]"
            >
              Use Sample Input
            </button>
            <button
              type="button"
              onClick={() => {
                setStdin(sampleInputForPattern(result?.detectedPattern));
                setSampleAssumed(true);
              }}
              className="rounded-md border border-signal-blue/25 bg-signal-blue/10 px-4 py-2 text-sm font-bold text-signal-blue transition hover:bg-signal-blue/15"
            >
              Generate Sample Input
            </button>
            <button
              type="button"
              onClick={onAnalyze}
              disabled={loading}
              className="rounded-md bg-white px-4 py-2 text-sm font-bold text-black transition hover:bg-zinc-200 disabled:cursor-wait disabled:bg-zinc-500"
            >
              {loading ? "Generating..." : "Generate Dry Run"}
            </button>
          </div>
        </div>
        <textarea
          value={stdin}
          onChange={(event) => {
            setStdin(event.target.value);
            setSampleAssumed(false);
          }}
          placeholder="Enter input here..."
          className="mt-4 min-h-32 w-full resize-y rounded-md border border-white/[0.1] bg-black/40 p-3 font-mono text-sm leading-6 text-zinc-200 outline-none"
        />
        {sampleAssumed ? (
          <p className="mt-3 rounded-md border border-signal-blue/20 bg-signal-blue/10 p-3 text-sm leading-6 text-signal-blue">
            Sample input assumed for explanation. Edit it if your problem uses a different case.
          </p>
        ) : null}
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
        <EmptyState text={stdin.trim() ? "Could not generate reliable dry run. Please provide code, input, and expected function call format." : "Input is required for a reliable dry run."} />
      ) : null}

      {dryRun && dryRun.rows.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <InfoCard label="Final Output Prediction" value={dryRun.finalOutput || "Not safely inferable from the logical dry run."} mono />
          <WatchPanel title="Variable Watch" items={dryRun.variableWatch} />
          <SnapshotPanel snapshots={dryRun.snapshots} />
        </div>
      ) : null}

      {hiddenRisks.length ? (
        <Section title="Hidden Test Risks" icon={<AlertTriangle className="h-4 w-4" />}>
          <BulletList items={hiddenRisks} empty="No hidden test risks returned." />
        </Section>
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
        <div key={`${testCase.type}-${testCase.title}`} className="min-w-0 rounded-md border border-white/[0.08] bg-[#111] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-white">{testCase.title}</h3>
            <Chip label={testCase.type} />
          </div>
          <p className="mb-3 text-sm leading-6 text-zinc-500">{testCase.explanation}</p>
          <div className="grid min-w-0 gap-3">
            <div className="min-w-0">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">Input</p>
              <pre className="max-h-36 min-w-0 overflow-auto whitespace-pre-wrap break-words rounded-md bg-black/45 p-3 font-mono text-xs leading-5 text-zinc-300">
                {testCase.input}
              </pre>
            </div>
            <div className="min-w-0">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">Expected</p>
              <pre className="max-h-36 min-w-0 overflow-auto whitespace-pre-wrap break-words rounded-md bg-black/45 p-3 font-mono text-xs leading-5 text-signal-green">
                {testCase.expectedOutput || "Expected output not safely inferable."}
              </pre>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AnalyzeVerdict({ result }: { result: CodeFlowAnalysisResult }) {
  const scores = result.review?.scores;
  const passed = (scores?.correctness ?? 0) >= 7 && (scores?.efficiency ?? 0) >= 7;

  return (
    <section className="overflow-hidden rounded-md border border-white/[0.08] bg-[linear-gradient(135deg,#1c1a24,#101113_70%)]">
      <div className="flex flex-wrap items-center gap-5 border-b border-white/[0.08] px-5 py-4 text-sm font-semibold text-[#a970ff]">
        <span className="inline-flex items-center gap-2"><Check className="h-4 w-4" /> Approach</span>
        <span className="inline-flex items-center gap-2"><Check className="h-4 w-4" /> Efficiency</span>
        <span className="inline-flex items-center gap-2"><Check className="h-4 w-4" /> Code Style</span>
      </div>
      <div className="p-5">
        <p className="text-lg leading-8 text-[#b265ff]">
          {passed
            ? "Strong attempt. The solution looks submission-ready with clear reasoning and acceptable complexity."
            : "Good start. Review the highlighted risks before submitting, especially correctness and edge cases."}
        </p>
      </div>
    </section>
  );
}

function ApproachReview({ result }: { result: CodeFlowAnalysisResult }) {
  return (
    <section className="rounded-md border border-white/[0.08] bg-[#111] p-5">
      <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-[#8b5cf6]">
        <Lightbulb className="h-5 w-5" />
        Approach
      </h3>
      <div className="space-y-3 text-sm leading-7">
        <p className="text-zinc-400">
          Current: <span className="font-bold text-white">{result.detectedAlgorithm || "Unknown"}</span>
        </p>
        <p className="text-zinc-400">
          Suggested: <span className="font-bold text-signal-green">{suggestedPattern(result)}</span>
        </p>
        <p className="text-zinc-400">
          Key Idea: <span className="text-white">{result.codeSummary || "No summary returned."}</span>
        </p>
        <p className="text-zinc-400">
          Consider: <span className="text-white">{result.analysis?.betterApproach || "No alternative approach was suggested."}</span>
        </p>
      </div>
    </section>
  );
}

function PerformancePanel({ result }: { result: CodeFlowAnalysisResult }) {
  const time = result.analysis?.timeComplexity.worst || "-";
  const space = result.analysis?.spaceComplexity.value || "-";
  const timeBeat = estimateBeat(time);
  const spaceBeat = estimateBeat(space);

  return (
    <section className="grid gap-4 md:grid-cols-2">
      <PerformanceCard
        icon={<Clock3 className="h-5 w-5" />}
        label="Runtime"
        value={time}
        beat={timeBeat}
        active
      />
      <PerformanceCard
        icon={<Cpu className="h-5 w-5" />}
        label="Memory"
        value={space}
        beat={spaceBeat}
      />
    </section>
  );
}

function PerformanceCard({
  icon,
  label,
  value,
  beat,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  beat: string;
  active?: boolean;
}) {
  return (
    <div className={`min-h-[150px] rounded-xl border p-5 ${active ? "border-white/[0.14] bg-white/[0.1]" : "border-white/[0.08] bg-[#111]"}`}>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xl text-white">
          <span className={active ? "text-white" : "text-zinc-500"}>{icon}</span>
          {label}
        </div>
        <span className="text-[#8b5cf6]">✦</span>
      </div>
      <p className="text-2xl font-bold text-white">
        {value} <span className="text-sm font-normal text-zinc-500">| Beats</span>{" "}
        <span className={active ? "text-white" : "text-zinc-400"}>{beat}</span>
      </p>
    </div>
  );
}

function ComplexityCurve({ result }: { result: CodeFlowAnalysisResult }) {
  const worst = result.analysis?.timeComplexity.worst ?? "";
  const curve = buildComplexityCurve(worst);
  const allCurves = buildAllComplexityCurves(worst);

  return (
    <section className="rounded-md border border-white/[0.08] bg-[#083f42] p-4 xl:col-span-2">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-xl font-bold text-white">
            <Gauge className="h-4 w-4" />
            Big-O Complexity
          </h3>
          <p className="mt-1 text-xs leading-5 text-zinc-200">
            Current code is highlighted as {worst || "unknown complexity"}.
          </p>
        </div>
        <Chip label={curve.label} />
      </div>
      <div className="h-[220px] rounded-md border border-white/[0.14] bg-[#063638] p-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={allCurves} margin={{ left: 0, right: 14, top: 8, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.25)" />
            <XAxis dataKey="n" stroke="#d4d4d8" tick={{ fontSize: 12 }} />
            <YAxis stroke="#d4d4d8" tick={{ fontSize: 11 }} domain={[0, 1000]} width={42} />
            <Tooltip
              contentStyle={{ background: "#09090b", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8 }}
              labelStyle={{ color: "#f4f4f5" }}
            />
            {complexitySeries.map((series) => (
              <Line
                key={series.key}
                type="monotone"
                dataKey={series.key}
                name={series.key === curve.key ? curve.label : series.label}
                stroke={series.color}
                strokeWidth={series.key === curve.key ? 5 : 2}
                dot={false}
                opacity={series.key === curve.key ? 1 : 0.55}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {complexitySeries.map((series) => (
          <span key={series.key} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${series.key === curve.key ? "border-white bg-white text-black" : "border-white/20 bg-white/10 text-white"}`}>
            <span className="h-2 w-2 rounded-full" style={{ background: series.color }} />
            {series.key === curve.key ? curve.label : series.label}
          </span>
        ))}
      </div>
    </section>
  );
}

function ComplexityReasoning({ result }: { result: CodeFlowAnalysisResult }) {
  const worst = result.analysis?.timeComplexity.worst || "unknown";
  const explanation = result.analysis?.timeComplexity.explanation || "No complexity reasoning returned.";
  const causes = inferComplexityCauses(result);

  return (
    <section className="rounded-md border border-white/[0.08] bg-[#111] p-5">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-zinc-400">
        <Lightbulb className="h-4 w-4" />
        How This Complexity Happens
      </h3>
      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-md border border-white/[0.08] bg-black/35 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Current Complexity</p>
          <p className="mt-3 text-3xl font-bold text-white">{worst}</p>
          <p className="mt-3 text-sm leading-6 text-zinc-400">{explanation}</p>
        </div>
        <div className="space-y-3">
          {causes.map((cause, index) => (
            <div key={cause} className="flex gap-3 rounded-md border border-white/[0.08] bg-black/35 p-3 text-sm leading-6 text-zinc-300">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-signal-blue/15 font-mono text-xs font-bold text-signal-blue">
                {index + 1}
              </span>
              <span>{cause}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
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

function InfoCard({
  label,
  value,
  mono = false,
  compact = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  compact?: boolean;
}) {
  return (
    <section className={`rounded-md border border-white/[0.08] bg-[#111] ${compact ? "p-3" : "p-4"}`}>
      <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">{label}</h3>
      <p className={`${compact ? "mt-2 max-h-20 text-xs leading-5" : "mt-3 max-h-36 text-sm leading-6"} overflow-auto text-zinc-200 ${mono ? "whitespace-pre-wrap font-mono" : ""}`}>
        {value}
      </p>
    </section>
  );
}

function WatchPanel({
  title,
  items,
}: {
  title: string;
  items?: NonNullable<NonNullable<CodeFlowAnalysisResult["dryRun"]>["variableWatch"]>;
}) {
  return (
    <section className="rounded-md border border-white/[0.08] bg-[#111] p-4">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">{title}</h3>
      {items?.length ? (
        <div className="max-h-64 space-y-2 overflow-auto">
          {items.map((item) => (
            <div key={`${item.step}-${JSON.stringify(item.variables)}`} className="rounded-md bg-black/35 p-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-signal-blue">Step {item.step}</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(item.variables).map(([key, value]) => (
                  <span key={`${item.step}-${key}`} className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 font-mono text-xs text-zinc-300">
                    {key}: {value}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm leading-6 text-zinc-500">No variable watch returned for this dry run.</p>
      )}
    </section>
  );
}

function SnapshotPanel({
  snapshots,
}: {
  snapshots?: NonNullable<NonNullable<CodeFlowAnalysisResult["dryRun"]>["snapshots"]>;
}) {
  return (
    <section className="rounded-md border border-white/[0.08] bg-[#111] p-4">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">State Snapshots</h3>
      {snapshots?.length ? (
        <div className="max-h-64 space-y-2 overflow-auto">
          {snapshots.map((snapshot) => (
            <div key={`${snapshot.step}-${snapshot.title}`} className="rounded-md border border-white/[0.08] bg-black/35 p-3">
              <p className="text-sm font-bold text-white">Step {snapshot.step}: {snapshot.title}</p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{snapshot.description}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm leading-6 text-zinc-500">No state snapshots returned for this dry run.</p>
      )}
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

function Chip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1 text-xs font-bold text-zinc-300">
      {label}
    </span>
  );
}

function prettyPattern(pattern?: string) {
  if (!pattern || pattern === "not generated yet") return "Not generated yet";
  return pattern
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function sampleInputForPattern(pattern?: string) {
  switch (pattern) {
    case "binary_search":
      return "nums = [1, 2, 3, 4, 5], target = 4";
    case "bfs":
    case "dfs_recursion":
      return "nodes = [1, 2, 3, 4, 5], edges = [[1, 2], [1, 3], [2, 4], [3, 5]], source = 1";
    case "graph_shortest_path":
      return "V = 5, edges = [[0, 1, 4], [0, 2, 1], [2, 1, 2], [1, 3, 1], [2, 3, 5]], source = 0";
    case "dp":
      return "n = 5";
    case "sliding_window":
      return "nums = [2, 1, 5, 1, 3, 2], k = 3";
    case "two_pointers":
      return "nums = [1, 2, 3, 4, 6], target = 6";
    case "stack":
      return "nums = [2, 1, 2, 4, 3]";
    case "heap":
      return "nums = [3, 2, 1, 5, 6, 4], k = 2";
    case "linked_list":
      return "head = [1, 2, 3, 4, 5]";
    case "tree":
      return "root = [1, 2, 3, null, 4]";
    case "sorting":
    default:
      return "nums = [5, 2, 3, 1]";
  }
}

const complexitySeries = [
  { key: "constant", label: "O(1)", color: "#36f5a3" },
  { key: "logarithmic", label: "O(log n)", color: "#ffd166" },
  { key: "linear", label: "O(n)", color: "#b8d991" },
  { key: "linearithmic", label: "O(n log n)", color: "#ffffff" },
  { key: "quadratic", label: "O(n^2)", color: "#7bd88f" },
  { key: "exponential", label: "O(2^n)", color: "#22d3c5" },
] as const;

function buildComplexityCurve(complexity: string) {
  const label = formatComplexityLabel(complexity);
  const normalized = complexity
    .toLowerCase()
    .replace(/[×·]/g, "*")
    .replace(/\s+/g, "")
    .replace(/\*\*/g, "^");
  const expression = normalized.match(/o\((.*)\)/)?.[1] ?? normalized;
  const hasSymbol = /[a-z]/.test(expression);
  const hasProduct = /[a-z]\*+[a-z]|[vnekm]\)[*]?|[a-z][a-z]/.test(expression.replace(/log/g, ""));
  const hasSquared = /\^2|²|n2|v2|e2|m2|k2/.test(expression);
  const hasLog = /log/.test(expression);
  const symbolsOutsideLog = expression.replace(/log/g, "").match(/[a-z]/g) ?? [];
  const hasLinearLogFactor = hasLog && symbolsOutsideLog.length > 1;
  const hasExp = /2\^[a-z]|exp|factorial|!/.test(expression);

  const key = hasExp
    ? "exponential"
    : hasSquared
      ? "quadratic"
      : hasLog
        ? expression.replace(/log/g, "").match(/[a-z]/)
          ? hasLinearLogFactor ? "linearithmic" : "logarithmic"
          : "logarithmic"
        : hasProduct
          ? "quadratic"
          : hasSymbol
            ? "linear"
            : "constant";

  return {
    key,
    label,
  };
}

function formatComplexityLabel(complexity: string) {
  const trimmed = complexity.trim();
  if (!trimmed) return "O(?)";
  if (/^o\(/i.test(trimmed)) return trimmed;
  return `O(${trimmed.replace(/^O\s*/i, "").replace(/^\(|\)$/g, "")})`;
}

function buildAllComplexityCurves(currentComplexity: string) {
  const current = buildComplexityCurve(currentComplexity).key;
  return Array.from({ length: 11 }, (_, index) => {
    const n = index * 10;
    return {
      n,
      constant: 20,
      logarithmic: n === 0 ? 0 : Math.round(Math.log2(n + 1) * 22),
      linear: n,
      linearithmic: n === 0 ? 0 : Math.min(1000, Math.round(n * Math.log2(n + 1))),
      quadratic: Math.min(1000, n * n / 2),
      exponential: Math.min(1000, Math.round(Math.pow(2, n / 5))),
      current,
    };
  });
}

function suggestedPattern(result: CodeFlowAnalysisResult) {
  const better = result.analysis?.betterApproach?.trim();
  if (better && !/already optimal|no better/i.test(better)) return better;
  return result.detectedAlgorithm || "No alternative pattern suggested";
}

function estimateBeat(complexity: string) {
  const key = buildComplexityCurve(complexity).key;
  const score: Record<string, string> = {
    constant: "99.90%",
    logarithmic: "97.40%",
    linear: "88.20%",
    linearithmic: "74.60%",
    quadratic: "42.15%",
    exponential: "9.80%",
  };
  return score[key] ?? "50.00%";
}

function inferComplexityCauses(result: CodeFlowAnalysisResult) {
  const algorithm = (result.detectedAlgorithm ?? "").toLowerCase();
  const worst = result.analysis?.timeComplexity.worst?.toLowerCase() ?? "";

  if (algorithm.includes("merge") || worst.includes("n log")) {
    return [
      "The array is split into halves again and again, creating about log n levels of recursion.",
      "At each level, merge work scans the elements in the current ranges, which totals about n work per level.",
      "n work across log n levels gives O(n log n). The temporary merge array causes O(n) auxiliary space.",
    ];
  }

  if (algorithm.includes("binary") || worst.includes("log")) {
    return [
      "Each step checks the middle element.",
      "Half of the search range is discarded after every comparison.",
      "Repeatedly halving the range gives O(log n).",
    ];
  }

  if (algorithm.includes("bfs") || algorithm.includes("dfs")) {
    return [
      "Each reachable node is visited at most once.",
      "Each edge is checked from the adjacency list.",
      "Visiting vertices plus scanning edges gives O(V + E).",
    ];
  }

  if (worst.includes("n^2") || worst.includes("n2")) {
    return [
      "There is nested repeated work over the input.",
      "For each outer step, the code may scan many inner elements.",
      "That repeated pairwise scanning leads to O(n^2).",
    ];
  }

  if (worst.includes("n")) {
    return [
      "The code processes each input item a constant number of times.",
      "There is no nested full scan over the same input.",
      "That direct pass over n items gives O(n).",
    ];
  }

  return [
    "The explanation is based on the loops, recursion, and data structures detected in the code.",
    "Check the approach section for the operation that dominates runtime.",
    "Use the dry run to connect each repeated operation with the final Big-O.",
  ];
}
