"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Cpu, Maximize2, Minimize2, PanelBottomClose, Sparkles, Zap } from "lucide-react";
import AnalysisTabs from "@/components/AnalysisTabs";
import CodeEditor from "@/components/CodeEditor";
import TerminalPanel from "@/components/TerminalPanel";
import TopBar from "@/components/TopBar";
import { useAlgoStore } from "@/store/useAlgoStore";

export default function Home() {
  const reviewCode = useAlgoStore((state) => state.reviewCode);
  const [analysisOpen, setAnalysisOpen] = useState(true);
  const [workspaceFullscreen, setWorkspaceFullscreen] = useState(false);
  const [typedHero, setTypedHero] = useState("");
  const heroText = "Paste code, add input, and watch every algorithm step unfold.";

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        reviewCode();
      }
      if (event.key === "Escape") setWorkspaceFullscreen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [reviewCode]);

  useEffect(() => {
    let index = 0;
    const interval = window.setInterval(() => {
      index += 1;
      setTypedHero(heroText.slice(0, index));
      if (index >= heroText.length) window.clearInterval(interval);
    }, 26);
    return () => window.clearInterval(interval);
  }, [heroText]);

  return (
    <main className="min-h-screen bg-editor-950 text-zinc-100">
      {/* Top accent gradient line */}
      <div
        className="h-[2px] w-full"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, #4f46e5 20%, #7c3aed 50%, #a78bfa 80%, transparent 100%)",
        }}
      />

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-editor-950/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[66px] max-w-[1800px] items-center justify-between px-6 sm:px-10 lg:px-12">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div
              className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[10px] border border-violet-500/30 bg-violet-500/10"
              style={{ boxShadow: "0 0 18px rgba(99,102,241,0.25)" }}
            >
              <Image
                src="/codeflow-logo.png"
                alt="CodeFlow"
                width={26}
                height={26}
                className="h-[26px] w-[26px] object-contain"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[21px] font-bold tracking-tight text-white">CodeFlow</span>
              <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-violet-400">
                Beta
              </span>
            </div>
          </div>

          {/* Nav pills */}
          <nav className="hidden items-center gap-1 lg:flex">
            {(["Dry Run", "Review", "Analyze", "Test Cases"] as const).map((item) => (
              <button
                key={item}
                type="button"
                className="rounded-lg px-3.5 py-2 text-sm font-medium text-zinc-400 transition hover:bg-white/[0.05] hover:text-white"
              >
                {item}
              </button>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 6px #34d399" }} />
              <span className="text-xs font-medium text-zinc-500">AI Ready</span>
            </div>
            <div className="h-4 w-px bg-white/[0.1]" />
            <button
              type="button"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-violet-500/35 bg-violet-500/12 px-4 text-sm font-semibold text-violet-300 transition hover:border-violet-400/55 hover:bg-violet-500/20 hover:text-violet-200"
            >
              <Zap className="h-3.5 w-3.5" />
              <span className="hidden sm:block">Get Started</span>
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1800px] px-6 sm:px-10 lg:px-12">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <div className="relative overflow-hidden py-12 pb-10">
          {/* Dot grid background */}
          <div className="hero-grid pointer-events-none absolute inset-0 opacity-60" />
          {/* Radial glow behind headline */}
          <div
            className="pointer-events-none absolute left-0 top-0 h-[360px] w-[600px]"
            style={{
              background:
                "radial-gradient(ellipse at 10% 30%, rgba(99,102,241,0.12) 0%, transparent 60%)",
            }}
          />

          <div className="relative">
            {/* Eyebrow badge */}
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-500/8 px-4 py-1.5">
              <Sparkles className="h-3.5 w-3.5 text-violet-400" />
              <span className="text-sm font-semibold text-violet-300">AI-Powered DSA Code Mentor</span>
            </div>

            <h1 className="text-[50px] font-black leading-[1.06] tracking-tight text-white sm:text-[68px]">
              Debug. Dry Run.
              <br />
              <span className="text-gradient-hero">Master Algorithms.</span>
            </h1>

            <p className="mt-4 max-w-[540px] text-[17px] leading-[1.75] text-zinc-400">
              <span>{typedHero}</span>
              <span className="typing-cursor" aria-hidden="true" />
            </p>

            {/* Language + feature pills */}
            <div className="mt-7 flex flex-wrap items-center gap-2">
              {["C++", "Java", "Python", "JavaScript"].map((lang) => (
                <span
                  key={lang}
                  className="rounded-full border border-white/[0.1] bg-white/[0.05] px-3.5 py-1.5 text-sm font-semibold text-zinc-300 transition hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-300"
                >
                  {lang}
                </span>
              ))}
              <span className="mx-1 text-zinc-700">·</span>
              {["Dry Run Tables", "AI Review", "Complexity Curves", "Test Cases"].map((feat) => (
                <span key={feat} className="flex items-center gap-1.5 text-sm text-zinc-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-500/50" />
                  {feat}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Fullscreen backdrop */}
        {workspaceFullscreen ? <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm" /> : null}

        {/* ── Workspace ────────────────────────────────────────── */}
        <WorkspaceShell
          isFullscreen={workspaceFullscreen}
          analysisOpen={analysisOpen}
          onToggleAnalysis={() => setAnalysisOpen((v) => !v)}
          onToggleFullscreen={() => setWorkspaceFullscreen((v) => !v)}
        />

        {/* ── Analysis panel ───────────────────────────────────── */}
        {analysisOpen ? (
          <section
            className="mt-4 overflow-hidden rounded-[18px] border border-violet-500/15 bg-editor-800 panel-enter"
            style={{
              boxShadow:
                "0 0 0 1px rgba(99,102,241,0.1), inset 0 1px 0 rgba(255,255,255,0.025)",
            }}
          >
            <AnalysisTabs />
          </section>
        ) : null}

        {/* ── Info sections ────────────────────────────────────── */}
        <InfoSections />
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] bg-editor-950 px-6 py-8 text-center">
        <p className="mx-auto inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-zinc-500">
          <Cpu className="h-4 w-4 text-violet-500" />
          <span className="footer-typewriter">Built by Drxquantam</span>
        </p>
      </footer>
    </main>
  );
}

function WorkspaceShell({
  isFullscreen,
  analysisOpen,
  onToggleAnalysis,
  onToggleFullscreen,
}: {
  isFullscreen: boolean;
  analysisOpen: boolean;
  onToggleAnalysis: () => void;
  onToggleFullscreen: () => void;
}) {
  return (
    <section
      className={`relative overflow-hidden border border-violet-500/18 bg-editor-900 transition-all duration-300 ${
        isFullscreen ? "fixed inset-3 z-50 rounded-[18px]" : "rounded-[20px]"
      }`}
      style={{ boxShadow: "0 40px 140px rgba(0,0,0,0.85), 0 0 100px rgba(99,102,241,0.07), 0 0 0 1px rgba(99,102,241,0.14)" }}
    >
      {/* Subtle inner gradient overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-0 rounded-[20px]"
        style={{
          background:
            "radial-gradient(ellipse at 30% 0%, rgba(99,102,241,0.06) 0%, transparent 50%)",
        }}
      />

      <div className="relative z-10">
        <TopBar
          analysisOpen={analysisOpen}
          onToggleAnalysis={onToggleAnalysis}
          isFullscreen={isFullscreen}
          onToggleFullscreen={onToggleFullscreen}
        />

        <div
          className={`grid grid-cols-1 xl:grid-cols-[minmax(0,60%)_1px_minmax(420px,40%)] ${
            isFullscreen ? "h-[calc(100%-108px)]" : "min-h-[560px]"
          }`}
        >
          <section className="min-h-[480px] min-w-0 bg-[#0d0d1e] xl:min-h-0">
            <CodeEditor />
          </section>

          <div className="hidden xl:block" style={{ background: "linear-gradient(180deg, rgba(99,102,241,0.2) 0%, rgba(99,102,241,0.05) 100%)" }} />

          <section className="min-h-[420px] border-t border-white/[0.06] bg-editor-850 xl:border-t-0">
            <TerminalPanel />
          </section>
        </div>
      </div>
    </section>
  );
}

/* ── Info sections ─────────────────────────────────────────────── */

const featureCards = [
  {
    icon: "🔍",
    title: "Review Code",
    body: "Find logical bugs, runtime risks, edge-case failures, and interview readiness gaps — instantly.",
    meta: "Ctrl+Enter",
    color: "from-blue-500/10 to-indigo-500/5",
    border: "border-blue-500/20",
  },
  {
    icon: "📊",
    title: "Analyze",
    body: "Understand the detected pattern, time/space complexity, better alternatives, and interview explanation.",
    meta: "Complexity graph",
    color: "from-violet-500/10 to-purple-500/5",
    border: "border-violet-500/20",
  },
  {
    icon: "▶",
    title: "Dry Run",
    body: "Step-by-step table with variable watch, state snapshots, output prediction and mentor chat.",
    meta: "Step tables",
    color: "from-emerald-500/10 to-teal-500/5",
    border: "border-emerald-500/20",
  },
  {
    icon: "🧪",
    title: "Test Cases",
    body: "Generate sample, edge, hidden-risk, and stress cases to harden your solution before submission.",
    meta: "Hidden cases",
    color: "from-amber-500/10 to-orange-500/5",
    border: "border-amber-500/20",
  },
];

const faqs = [
  {
    question: "What is CodeFlow?",
    answer:
      "CodeFlow is an AI-powered DSA code mentor. It combines review, algorithm analysis, complexity graphs, dry-run tables, mentor chat, and test-case generation in one workspace.",
  },
  {
    question: "Does CodeFlow execute code?",
    answer:
      "No. CodeFlow focuses on static AI review, reasoning, dry-run mentoring, and test-case planning — not on executing arbitrary code.",
  },
  {
    question: "How do I generate a dry run?",
    answer:
      "Paste your code, add input in the terminal panel (or use 'Use Sample Input'), switch to the Dry Run tab, then click Generate Dry Run.",
  },
  {
    question: "What languages are supported?",
    answer:
      "C++, Java, Python, and JavaScript — with language-aware review, dry-run generation, complexity reasoning, and test-case planning.",
  },
  {
    question: "What does the complexity graph show?",
    answer:
      "A visual growth curve comparing your solution's complexity class against O(1), O(log n), O(n), O(n log n), O(n²), and O(2ⁿ) — so you know why a solution may TLE.",
  },
  {
    question: "Can this help with LeetCode practice?",
    answer:
      "Yes. CodeFlow is designed around DSA workflows: AI review, dry-run tables, complexity curves, hidden test cases, and interview-ready explanations.",
  },
];

function InfoSections() {
  return (
    <section className="mx-auto mt-20 max-w-[1160px] space-y-20 pb-28">
      {/* Feature cards */}
      <div>
        <div className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-violet-500">Features</div>
        <h2 className="text-[30px] font-bold text-white">Everything you need to master DSA</h2>
        <div className="mt-7 grid gap-4 md:grid-cols-2">
          {featureCards.map((card) => (
            <article
              key={card.title}
              className={`group relative overflow-hidden rounded-[16px] border ${card.border} bg-gradient-to-br ${card.color} p-6 transition duration-300 hover:-translate-y-1 hover:shadow-card-hover`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{card.icon}</span>
                  <h3 className="text-[19px] font-bold text-white">{card.title}</h3>
                </div>
                <span className="shrink-0 rounded-full border border-white/[0.12] bg-black/30 px-3 py-1 text-xs font-semibold text-zinc-400">
                  {card.meta}
                </span>
              </div>
              <p className="mt-4 text-[15px] leading-7 text-zinc-400">{card.body}</p>
            </article>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div>
        <div className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-violet-500">FAQ</div>
        <h2 className="text-[30px] font-bold text-white">Frequently Asked Questions</h2>
        <div className="mt-7 divide-y divide-white/[0.06] overflow-hidden rounded-[16px] border border-white/[0.08] bg-editor-800">
          {faqs.map((faq) => (
            <details key={faq.question} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4 text-[15px] font-semibold text-zinc-200 transition hover:bg-white/[0.03] hover:text-white">
                <span>{faq.question}</span>
                <span className="ml-4 shrink-0 text-zinc-600 transition-transform group-open:rotate-180">
                  ↓
                </span>
              </summary>
              <p className="px-6 pb-5 text-[15px] leading-7 text-zinc-400">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
