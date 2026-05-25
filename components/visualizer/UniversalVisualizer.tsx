"use client";

import { Wand2 } from "lucide-react";
import { useState } from "react";
import type { TraceResult } from "@/types/trace";
import TracePlayer from "./renderers/TracePlayer";

const demos = [
  {
    name: "DFS disconnected graph",
    code: "void dfs(int node) { visited[node] = true; for (auto next : adj[node]) if (!visited[next]) dfs(next); }",
    languageHint: "cpp",
    structuredInput: {
      algorithm: "dfs",
      nodes: [1, 2, 3, 4, 5, 6, 7],
      edges: [[1, 2], [2, 3], [2, 7], [7, 5], [3, 5], [4, 6]],
      source: 1,
      target: 6,
      directed: false,
    },
  },
  {
    name: "BFS graph",
    code: "queue<int> q; q.push(source); while(!q.empty()) { int node = q.front(); q.pop(); }",
    languageHint: "cpp",
    structuredInput: {
      algorithm: "bfs",
      nodes: [0, 1, 2, 3, 4],
      edges: [[0, 1], [0, 2], [0, 3], [2, 4]],
      source: 0,
      target: 4,
      directed: false,
    },
  },
  {
    name: "Merge Sort",
    code: "function mergeSort(nums) { /* split, merge, write back */ }",
    languageHint: "javascript",
    structuredInput: { algorithm: "merge sort", nums: [5, 2, 3, 1, 4] },
  },
  {
    name: "Binary Search",
    code: "while (low <= high) { mid = Math.floor((low + high) / 2); }",
    languageHint: "javascript",
    structuredInput: { algorithm: "binary search", nums: [1, 2, 3, 4, 5, 6, 7], target: 6 },
  },
  {
    name: "Quick Sort",
    code: "function quickSort(nums) { const pivot = nums[high]; partition(); }",
    languageHint: "javascript",
    structuredInput: { algorithm: "quick sort", nums: [5, 2, 3, 1, 4] },
  },
];

export default function UniversalVisualizer() {
  const [code, setCode] = useState(demos[0].code);
  const [languageHint, setLanguageHint] = useState(demos[0].languageHint);
  const [structuredInput, setStructuredInput] = useState(JSON.stringify(demos[0].structuredInput, null, 2));
  const [result, setResult] = useState<TraceResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadDemo = (index: number) => {
    const demo = demos[index];
    setCode(demo.code);
    setLanguageHint(demo.languageHint);
    setStructuredInput(JSON.stringify(demo.structuredInput, null, 2));
    setResult(null);
    setError("");
  };

  const generateTrace = async () => {
    setLoading(true);
    setError("");

    try {
      let parsedInput: unknown = undefined;
      if (structuredInput.trim()) {
        parsedInput = JSON.parse(structuredInput);
      }

      const response = await fetch("/api/trace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "universal", code, structuredInput: parsedInput, languageHint }),
      });
      const payload = (await response.json()) as TraceResult;

      if (!response.ok) {
        throw new Error(payload.errors?.[0] ?? payload.fallbackMessage ?? "Trace generation failed.");
      }

      setResult(payload);
    } catch (caught) {
      setError(caught instanceof SyntaxError ? "Structured input must be valid JSON." : caught instanceof Error ? caught.message : "Trace generation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-white/[0.08] bg-[#111] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-400">
              Universal Execution Trace
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
              CodeFlow provides universal execution tracing for runnable code and upgrades recognized DSA patterns into rich algorithm-specific visualizations.
            </p>
          </div>
          <button
            type="button"
            onClick={generateTrace}
            disabled={loading}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-white px-4 text-sm font-bold text-black transition hover:bg-zinc-200 disabled:cursor-wait disabled:bg-zinc-500"
          >
            <Wand2 className="h-4 w-4" />
            {loading ? "Generating..." : "Generate Trace"}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {demos.map((demo, index) => (
            <button
              key={demo.name}
              type="button"
              onClick={() => loadDemo(index)}
              className="rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-zinc-300 transition hover:border-white/25 hover:text-white"
            >
              {demo.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-4">
          <Field label="Language Hint">
            <select
              value={languageHint}
              onChange={(event) => setLanguageHint(event.target.value)}
              className="h-10 w-full rounded-md border border-white/[0.1] bg-black/40 px-3 text-sm text-zinc-200 outline-none"
            >
              <option value="cpp">C++</option>
              <option value="java">Java</option>
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="unknown">Unknown</option>
            </select>
          </Field>

          <Field label="Code / Question">
            <textarea
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="min-h-40 w-full resize-y rounded-md border border-white/[0.1] bg-black/40 p-3 font-mono text-sm leading-6 text-zinc-200 outline-none"
            />
          </Field>

          <Field label="Structured Input JSON">
            <textarea
              value={structuredInput}
              onChange={(event) => setStructuredInput(event.target.value)}
              className="min-h-72 w-full resize-y rounded-md border border-white/[0.1] bg-black/40 p-3 font-mono text-sm leading-6 text-zinc-200 outline-none"
            />
          </Field>

          {error ? (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </p>
          ) : null}
        </div>

        <TracePlayer key={result ? `${result.strategy}-${result.algorithm ?? "none"}-${result.frames.length}` : "empty"} result={result} />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block rounded-md border border-white/[0.08] bg-[#111] p-3">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">{label}</span>
      {children}
    </label>
  );
}
