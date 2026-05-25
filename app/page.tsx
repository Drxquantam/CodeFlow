"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Sun } from "lucide-react";
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
  const heroText =
    "Paste a solution, add messy problem input, and watch the algorithm unfold as dry runs, graphs, queues, stacks, and complexity curves.";

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        reviewCode();
      }

      if (event.key === "Escape") {
        setWorkspaceFullscreen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [reviewCode]);

  useEffect(() => {
    let index = 0;

    const interval = window.setInterval(() => {
      index += 1;
      setTypedHero(heroText.slice(0, index));

      if (index >= heroText.length) {
        window.clearInterval(interval);
      }
    }, 24);

    return () => window.clearInterval(interval);
  }, [heroText]);

  return (
    <main className="min-h-screen bg-[#050505] text-zinc-100">
      <HeroAnimationStyles />
      <header className="border-b border-white/[0.08] bg-[#070707]">
        <div className="mx-auto flex h-[86px] max-w-[1800px] items-center justify-between px-6 sm:px-10 lg:px-12">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-[13px] border border-white/[0.1] bg-white/[0.045] shadow-insetLine">
              <Image
                src="/codeflow-logo.png"
                alt="CodeFlow logo"
                width={36}
                height={36}
                className="h-9 w-9 object-contain"
              />
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-[26px] font-semibold tracking-normal text-white">CodeFlow</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-zinc-400">
            <button
              type="button"
              aria-label="Theme"
              title="Theme"
              className="grid h-11 w-11 place-items-center rounded-[14px] border border-white/[0.14] bg-white/[0.035] text-zinc-200 transition duration-200 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.08]"
            >
              <Sun className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1800px] px-6 py-12 sm:px-10 lg:px-12">
        <div className="mb-9 max-w-[980px]">
          <h1 className="text-[42px] font-bold leading-tight tracking-normal text-white sm:text-[58px]">
            DSA Code Mentor
          </h1>
          <p className="mt-5 max-w-[1080px] text-[24px] leading-10 text-zinc-100">
            <span>{typedHero}</span>
            <span className="typing-cursor" aria-hidden="true" />
          </p>
        </div>

        {workspaceFullscreen ? <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm" /> : null}

        <VisualizerShell
          isFullscreen={workspaceFullscreen}
          analysisOpen={analysisOpen}
          onToggleAnalysis={() => setAnalysisOpen((value) => !value)}
          onToggleFullscreen={() => setWorkspaceFullscreen((value) => !value)}
        />

        {analysisOpen ? (
          <section className="mt-8 overflow-hidden rounded-[18px] border border-white/[0.09] bg-carbon-900">
            <AnalysisTabs />
          </section>
        ) : null}

        <InfoSections />
      </section>

      <footer className="border-t border-white/[0.08] bg-[#050505] px-6 py-10 text-center sm:px-10 lg:px-12">
        <p className="mx-auto inline-flex items-center font-mono text-sm font-bold uppercase tracking-[0.18em] text-white">
          <span className="footer-typewriter">Built by Drxquantam</span>
        </p>
      </footer>
    </main>
  );
}

function VisualizerShell({
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
      className={`overflow-hidden border border-white/[0.1] bg-carbon-900 shadow-2xl shadow-black/40 transition-all duration-300 ${
        isFullscreen ? "fixed inset-3 z-50 rounded-[18px]" : "rounded-[22px]"
      }`}
    >
      <TopBar
        analysisOpen={analysisOpen}
        onToggleAnalysis={onToggleAnalysis}
        isFullscreen={isFullscreen}
        onToggleFullscreen={onToggleFullscreen}
      />

      <div
        className={`grid grid-cols-1 xl:grid-cols-[minmax(0,60%)_1px_minmax(420px,40%)] ${
          isFullscreen ? "h-[calc(100%-72px)]" : "min-h-[540px]"
        }`}
      >
        <section className="min-h-[480px] min-w-0 bg-[#151515] xl:min-h-0">
          <CodeEditor />
        </section>

        <div className="hidden bg-white/[0.08] xl:block" />

        <section className="min-h-[420px] border-t border-white/[0.08] bg-carbon-950 xl:border-t-0">
          <TerminalPanel />
        </section>
      </div>
    </section>
  );
}

function HeroAnimationStyles() {
  return (
    <style jsx global>{`
      .typing-cursor {
        display: inline-block;
        width: 2px;
        height: 1.05em;
        margin-left: 4px;
        transform: translateY(3px);
        background: #f4f4f5;
        animation: typing-cursor-blink 850ms steps(1) infinite;
      }

      @keyframes typing-cursor-blink {
        0%,
        45% {
          opacity: 1;
        }
        46%,
        100% {
          opacity: 0;
        }
      }

      .footer-typewriter {
        display: inline-block;
        width: auto;
        max-width: 0;
        overflow: hidden;
        white-space: nowrap;
        border-right: 2px solid #4ea1ff;
        animation:
          footer-type 4.8s steps(20, end) infinite,
          footer-caret 850ms steps(1) infinite;
      }

      @keyframes footer-type {
        0% {
          max-width: 0;
        }
        42%,
        72% {
          max-width: 360px;
        }
        100% {
          max-width: 0;
        }
      }

      @keyframes footer-caret {
        0%,
        45% {
          border-color: #4ea1ff;
        }
        46%,
        100% {
          border-color: transparent;
        }
      }
    `}</style>
  );
}

const languageTags = [
  "C++",
  "Java",
  "Python",
  "JavaScript",
];

const featureCards = [
  {
    title: "Review Code",
    body: "Find logical bugs, runtime risks, edge-case failures, code-quality issues, and interview readiness gaps.",
    meta: "Ctrl+Enter",
  },
  {
    title: "Analyze",
    body: "Understand the detected pattern, approach, time and space complexity, better alternatives, and interview explanation.",
    meta: "Complexity graph",
  },
  {
    title: "Dry Run",
    body: "Generate a detailed step table, variable watch, state snapshots, output prediction, and ask questions while learning.",
    meta: "Mentor chat",
  },
  {
    title: "Test Cases",
    body: "Generate sample, edge, hidden-risk, and stress cases to check whether your solution survives real submissions.",
    meta: "Hidden cases",
  },
];

const faqs = [
  {
    question: "What is CodeFlow?",
    answer:
      "CodeFlow is an AI-powered DSA code mentor. It combines review, algorithm analysis, complexity graphs, dry-run tables, mentor chat, and test-case generation in one focused workspace.",
  },
  {
    question: "Does CodeFlow execute code?",
    answer:
      "No. CodeFlow focuses on static AI review, reasoning, dry-run mentoring, and test-case planning instead of executing arbitrary code.",
  },
  {
    question: "How do I review my code?",
    answer:
      "Pick a language, paste a solution, add input if the algorithm needs it, then click Review Code or press Ctrl+Enter.",
  },
  {
    question: "What does Reset do?",
    answer:
      "Reset restores the default boilerplate for the selected language and clears the current review panel.",
  },
  {
    question: "What is the complexity analyzer?",
    answer:
      "It explains expected time and space complexity and shows a visual growth curve so you can understand why an approach may pass or fail constraints.",
  },
  {
    question: "What is the dry-run table?",
    answer:
      "The dry-run table shows important variables, state snapshots, likely output, and warnings step by step. You can also ask questions about the dry run in the mentor chat.",
  },
  {
    question: "Can this help with LeetCode practice?",
    answer:
      "Yes. CodeFlow is designed around DSA workflows: AI review, dry-run tables, complexity curves, hidden test cases, and interview-ready explanations.",
  },
];

function InfoSections() {
  return (
    <section className="mx-auto mt-16 max-w-[1120px] space-y-16 pb-24">
      <ContentBlock
        eyebrow="About CodeFlow"
        title="Review, dry-run, and improve DSA code"
        body="CodeFlow is an AI-powered DSA code mentor for learners, interview prep, and competitive programming practice. It helps you review correctness, understand complexity, walk through dry runs, ask follow-up questions, and prepare stronger test cases without pretending to execute arbitrary code."
      />

      <section>
        <h2 className="text-[30px] font-bold leading-tight text-white">How To Use CodeFlow</h2>
        <ol className="mt-5 space-y-3 text-[17px] leading-8 text-zinc-300">
          <li>
            <strong className="text-white">1. Choose a language:</strong> Select C++, Java,
            Python, or JavaScript from the language dropdown.
          </li>
          <li>
            <strong className="text-white">2. Paste or write a solution:</strong> Start from a clean
            boilerplate or paste LeetCode/GFG-style class code directly.
          </li>
          <li>
            <strong className="text-white">3. Add stdin:</strong> Paste input in the right panel
            so the dry run can follow the same test case.
          </li>
          <li>
            <strong className="text-white">4. Review or reset:</strong> Click Review Code or press
            Ctrl+Enter. Use Reset to restore the selected language boilerplate.
          </li>
          <li>
            <strong className="text-white">5. Learn:</strong> Use Review, Analyze, Dry Run, and
            Test Cases to understand the solution and improve it before submission.
          </li>
        </ol>
      </section>

      <section>
        <h2 className="text-[30px] font-bold leading-tight text-white">Supported Programming Languages</h2>
        <p className="mt-4 max-w-[900px] text-[17px] leading-8 text-zinc-300">
          Start with clean boilerplates for C++, Java, Python, and JavaScript. CodeFlow focuses on
          language-aware review, dry-run generation, complexity reasoning, and test-case planning rather than raw execution.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {languageTags.map((language) => (
            <span
              key={language}
              className="rounded-full border border-white/[0.16] bg-white/[0.07] px-4 py-1.5 text-sm font-bold text-zinc-100 transition duration-200 hover:-translate-y-1 hover:border-white/35 hover:bg-white/[0.13] hover:shadow-[0_10px_30px_rgba(255,255,255,0.08)]"
            >
              {language}
            </span>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-[30px] font-bold leading-tight text-white">What Each Feature Does</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {featureCards.map((feature) => (
            <article
              key={feature.title}
              className="min-h-[240px] rounded-[14px] border border-white/[0.12] bg-[#101010] p-6 transition duration-200 ease-out hover:-translate-y-2 hover:scale-[1.015] hover:border-white/30 hover:bg-[#151515] hover:shadow-[0_22px_70px_rgba(0,0,0,0.55)]"
            >
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-[21px] font-bold leading-tight text-white">{feature.title}</h3>
                <span className="rounded-full border border-white/[0.12] bg-white/[0.06] px-3 py-1 text-xs font-semibold text-zinc-300">
                  {feature.meta}
                </span>
              </div>
              <p className="mt-4 text-[16px] leading-7 text-zinc-300">{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-[30px] font-bold leading-tight text-white">Why Use CodeFlow</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {[
            ["No Setup Required", "Skip local setup. Open the page and start reasoning through a solution in seconds."],
            ["Mentor-Ready Workspace", "Use Monaco as the coding surface, then let CodeFlow review the solution, explain the approach, and guide your next improvement."],
            ["DSA-Focused Learning", "Use dry runs, variable watches, complexity graphs, and interview explanations while practicing."],
            ["Fast Feedback", "See correctness risks, edge cases, dry runs, test cases, and complexity insights in one focused workflow."],
          ].map(([title, body]) => (
            <article
              key={title}
              className="min-h-[168px] rounded-[14px] border border-white/[0.12] bg-[#101010] p-6 transition duration-200 ease-out hover:-translate-y-2 hover:scale-[1.015] hover:border-white/30 hover:bg-[#151515] hover:shadow-[0_22px_70px_rgba(0,0,0,0.55)]"
            >
              <h3 className="text-[21px] font-bold leading-tight text-white">{title}</h3>
              <p className="mt-4 text-[17px] leading-8 text-zinc-300">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-[30px] font-bold leading-tight text-white">Popular Language Guides</h2>
        <div className="mt-6 space-y-6">
          <Guide title="C++ DSA Code Mentor">
            Use the C++ boilerplate for competitive programming, STL practice, graph problems,
            dynamic programming, and interview-style DSA.
          </Guide>
          <Guide title="Python DSA Code Mentor">
            Write quick scripts, solve algorithm problems, and test input parsing without leaving
            the browser.
          </Guide>
          <Guide title="Java DSA Code Mentor">
            Practice class-based solutions, collections, queues, maps, and common interview
            templates.
          </Guide>
          <Guide title="JavaScript DSA Code Mentor">
            Review JavaScript snippets, test logic, and practice frontend-friendly problem solving in
            a compact visual workspace.
          </Guide>
        </div>
      </section>

      <section>
        <h2 className="text-[30px] font-bold leading-tight text-white">Frequently Asked Questions</h2>
        <div className="mt-6 divide-y divide-white/[0.08] overflow-hidden rounded-[14px] border border-white/[0.12] bg-[#101010]">
          {faqs.map((faq) => (
            <details key={faq.question} className="group">
              <summary className="cursor-pointer list-none px-5 py-4 text-[15px] font-semibold text-white transition hover:bg-white/[0.04]">
                <span>{faq.question}</span>
                <span className="float-right text-zinc-500 transition group-open:rotate-180">
                  v
                </span>
              </summary>
              <p className="px-5 pb-5 text-[15px] leading-7 text-zinc-300">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </section>
  );
}

function ContentBlock({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <section>
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-signal-blue">{eyebrow}</p>
      <h2 className="mt-3 text-[32px] font-bold leading-tight text-white">{title}</h2>
      <p className="mt-4 max-w-[980px] text-[17px] leading-8 text-zinc-300">{body}</p>
    </section>
  );
}

function Guide({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="rounded-[14px] border border-transparent p-1 transition duration-200 hover:-translate-y-1 hover:border-white/[0.12] hover:bg-white/[0.035]">
      <h3 className="text-xl font-bold text-white">{title}</h3>
      <p className="mt-2 max-w-[980px] text-[16px] leading-7 text-zinc-300">{children}</p>
    </article>
  );
}
