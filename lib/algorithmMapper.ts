import type { AnalyzerResult, TraceResult } from "@/types/trace";
import { generateBinarySearchTrace } from "@/lib/traceEngines/array/binarySearchTrace";
import { generateMergeSortTrace } from "@/lib/traceEngines/array/mergeSortTrace";
import { generateQuickSortTrace } from "@/lib/traceEngines/array/quickSortTrace";
import { generateDPTableTrace } from "@/lib/traceEngines/dp/dpTableTrace";
import { generateBFSTrace } from "@/lib/traceEngines/graph/bfsTrace";
import { generateDFSTrace } from "@/lib/traceEngines/graph/dfsTrace";
import { runJavaScriptWithTracing } from "@/lib/runtime/jsInstrumentedRunner";
import { generateTraceHookSuggestion } from "@/lib/traceHooks";

type GeneratePayload = {
  analysis: AnalyzerResult;
  structuredInput?: unknown;
  code?: string;
};

export async function generateTraceFromAnalysis(payload: GeneratePayload): Promise<TraceResult> {
  const { analysis, structuredInput, code = "" } = payload;

  if (analysis.strategy === "instrumented-runtime") {
    return runJavaScriptWithTracing(code, structuredInput);
  }

  if (analysis.strategy === "trace-hooks") {
    const suggestion = generateTraceHookSuggestion(analysis.language, analysis.algorithm);
    return {
      success: false,
      strategy: "trace-hooks",
      algorithm: analysis.algorithm,
      language: analysis.language,
      frames: [
        {
          step: 1,
          type: "generic",
          operation: "Trace hooks required",
          explanation: suggestion.message,
          generic: {
            state: { helper: suggestion.helper },
          },
        },
      ],
      requiredInput: analysis.requiredInput,
      fallbackMessage: suggestion.message,
    };
  }

  if (analysis.strategy !== "deterministic") {
    return fallbackResult(analysis, "No deterministic trace is available for this input yet.");
  }

  const input = asRecord(structuredInput);
  if (!input) {
    return fallbackResult(analysis, "Structured JSON input is required for deterministic visualization.");
  }

  const algorithm = normalizeAlgorithm(String(input.algorithm ?? analysis.algorithm ?? ""));

  if (algorithm === "dfs" || algorithm === "bfs") {
    const graph = parseGraphInput(input);
    if (!graph) {
      return missingInputResult(analysis, ["nodes", "edges", "source"]);
    }

    const frames = algorithm === "dfs" ? generateDFSTrace(graph) : generateBFSTrace(graph);
    return successResult(analysis, algorithm, frames);
  }

  if (algorithm === "merge sort") {
    const nums = parseNums(input);
    if (!nums) return missingInputResult(analysis, ["nums"]);
    return successResult(analysis, algorithm, generateMergeSortTrace(nums));
  }

  if (algorithm === "binary search") {
    const nums = parseNums(input);
    const target = typeof input.target === "number" ? input.target : null;
    if (!nums || target == null) return missingInputResult(analysis, ["nums", "target"]);
    return successResult(analysis, algorithm, generateBinarySearchTrace({ nums, target }));
  }

  if (algorithm === "quick sort") {
    const nums = parseNums(input);
    if (!nums) return missingInputResult(analysis, ["nums"]);
    return successResult(analysis, algorithm, generateQuickSortTrace(nums));
  }

  if (algorithm === "dp") {
    const table = parseTable(input.table);
    const updates = parseUpdates(input.updates);
    if (!table || !updates) return missingInputResult(analysis, ["table", "updates"]);
    return successResult(analysis, algorithm, generateDPTableTrace({ table, updates }));
  }

  return fallbackResult(analysis, "Algorithm is recognized, but no deterministic engine is connected for it yet.");
}

function successResult(analysis: AnalyzerResult, algorithm: string, frames: TraceResult["frames"]): TraceResult {
  return {
    success: frames.length > 0,
    strategy: "deterministic",
    algorithm,
    language: analysis.language,
    frames,
    warnings: analysis.warnings,
  };
}

function missingInputResult(analysis: AnalyzerResult, requiredInput: string[]): TraceResult {
  return {
    success: false,
    strategy: analysis.strategy,
    algorithm: analysis.algorithm,
    language: analysis.language,
    frames: [],
    requiredInput,
    fallbackMessage: `Missing structured input: ${requiredInput.join(", ")}.`,
  };
}

function fallbackResult(analysis: AnalyzerResult, message: string): TraceResult {
  return {
    success: false,
    strategy: "fallback",
    algorithm: analysis.algorithm,
    language: analysis.language,
    frames: [
      {
        step: 1,
        type: "generic",
        operation: "Visualization unavailable",
        explanation: message,
        generic: {
          state: { requiredInput: analysis.requiredInput ?? [] },
        },
      },
    ],
    requiredInput: analysis.requiredInput,
    fallbackMessage: message,
  };
}

function normalizeAlgorithm(value: string) {
  return value.toLowerCase().replace(/_/g, " ").trim();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function parseNums(input: Record<string, unknown>) {
  const raw = input.nums ?? input.array ?? input.arr;
  return Array.isArray(raw) && raw.every((value) => typeof value === "number") ? raw : null;
}

function parseGraphInput(input: Record<string, unknown>) {
  const nodes = input.nodes;
  const edges = input.edges;
  const source = input.source;
  const directed = Boolean(input.directed);

  if (!Array.isArray(nodes) || !Array.isArray(edges) || source == null) return null;
  const parsedEdges = edges
    .map((edge) => Array.isArray(edge) && edge.length >= 2 ? [edge[0], edge[1]] as [string | number, string | number] : null)
    .filter((edge): edge is [string | number, string | number] => edge != null);

  if (!parsedEdges.length) return null;

  return {
    nodes: nodes.filter((node): node is string | number => typeof node === "string" || typeof node === "number"),
    edges: parsedEdges,
    source: source as string | number,
    target: input.target as string | number | undefined,
    directed,
  };
}

function parseTable(value: unknown) {
  if (!Array.isArray(value)) return null;
  const table = value.filter(Array.isArray) as Array<Array<unknown>>;
  return table.map((row) => row.filter((cell): cell is number | string => typeof cell === "number" || typeof cell === "string"));
}

function parseUpdates(value: unknown) {
  if (!Array.isArray(value)) return null;
  return value
    .map((item) => {
      const update = asRecord(item);
      if (!update || !Array.isArray(update.cell) || update.cell.length < 2) return null;
      const [row, column] = update.cell;
      if (typeof row !== "number" || typeof column !== "number") return null;
      const nextValue = update.value;
      if (typeof nextValue !== "number" && typeof nextValue !== "string") return null;
      return {
        cell: [row, column] as [number, number],
        value: nextValue,
        operation: typeof update.operation === "string" ? update.operation : undefined,
        explanation: typeof update.explanation === "string" ? update.explanation : undefined,
      };
    })
    .filter((update): update is NonNullable<typeof update> => update != null);
}
