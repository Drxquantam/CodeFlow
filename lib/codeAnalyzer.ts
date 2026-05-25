import type { AnalyzerResult, TraceStrategy } from "@/types/trace";

type AnalyzePayload = {
  code?: string;
  question?: string;
  structuredInput?: unknown;
  languageHint?: string;
};

export function analyzeCodeOrQuestion(payload: AnalyzePayload): AnalyzerResult {
  const code = payload.code ?? "";
  const question = payload.question ?? "";
  const text = `${code}\n${question}`;
  const language = detectLanguage(code, payload.languageHint);
  const algorithm = detectAlgorithm(text);
  const dataStructure = detectDataStructure(text, algorithm);
  const requiredInput = getRequiredInput(algorithm);
  const hasStructuredInput = payload.structuredInput != null;
  const strategy = chooseStrategy({
    language,
    algorithm,
    hasStructuredInput,
  });

  return {
    language,
    algorithm,
    dataStructure,
    confidence: algorithm ? (hasStructuredInput ? 0.9 : 0.72) : 0.35,
    strategy,
    extractedInput: payload.structuredInput,
    warnings: strategy === "fallback" ? ["No supported deterministic trace strategy was found."] : [],
    requiredInput: hasStructuredInput ? [] : requiredInput,
  };
}

function detectLanguage(code: string, hint?: string): AnalyzerResult["language"] {
  const normalizedHint = hint?.toLowerCase();
  if (normalizedHint?.includes("typescript")) return "typescript";
  if (normalizedHint?.includes("javascript")) return "javascript";
  if (normalizedHint?.includes("python")) return "python";
  if (normalizedHint?.includes("java") && !normalizedHint.includes("javascript")) return "java";
  if (normalizedHint?.includes("c++") || normalizedHint?.includes("cpp")) return "cpp";

  if (/#include|using\s+namespace\s+std|vector\s*</.test(code)) return "cpp";
  if (/public\s+class|static\s+void\s+main|System\.out/.test(code)) return "java";
  if (/\bdef\s+\w+\s*\(|print\s*\(|:\s*\n\s+/.test(code)) return "python";
  if (/\binterface\s+\w+|:\s*(number|string|boolean)\b|type\s+\w+\s*=/.test(code)) return "typescript";
  if (/\bfunction\b|\bconst\b|\blet\b|console\.log/.test(code)) return "javascript";

  return "unknown";
}

function detectAlgorithm(text: string) {
  const value = text.toLowerCase();

  if (/dijkstra|priority_queue|heapq|dist\b|relax/.test(value)) return "dijkstra";
  if (/bellman|n\s*-\s*1|relax all edges/.test(value)) return "bellman-ford";
  if (/topo|indegree|dag/.test(value)) return "topological sort";
  if (/merge\s*sort|mergesort|mergesort|merge\s*\(/.test(value)) return "merge sort";
  if (/quick\s*sort|quicksort|partition|pivot/.test(value)) return "quick sort";
  if (/binary\s*search|\blow\b[\s\S]*\bmid\b[\s\S]*\bhigh\b/.test(value)) return "binary search";
  if (/sliding\s*window|window/.test(value)) return "sliding window";
  if (/two\s*pointer|\bleft\b[\s\S]*\bright\b|\bi\b[\s\S]*\bj\b/.test(value)) return "two pointer";
  if (/\bdp\b|memo|table/.test(value)) return "dp";
  if (/inorder|preorder|postorder|root|left|right/.test(value)) return "tree traversal";
  if (/listnode|linked\s*list|slow|fast|next/.test(value)) return "linked list";
  if (/\bbfs\b|queue|enqueue|dequeue/.test(value)) return "bfs";
  if (/\bdfs\b|visited|recursion|adj/.test(value)) return "dfs";

  return undefined;
}

function detectDataStructure(text: string, algorithm?: string) {
  const value = text.toLowerCase();
  if (algorithm === "dfs" || algorithm === "bfs" || /adj|edges|graph/.test(value)) return "graph";
  if (algorithm?.includes("sort") || algorithm === "binary search" || /array|nums|arr/.test(value)) return "array";
  if (algorithm === "dp") return "dp table";
  if (algorithm === "linked list") return "linked list";
  if (algorithm === "tree traversal") return "tree";
  return undefined;
}

function chooseStrategy({
  language,
  algorithm,
  hasStructuredInput,
}: {
  language: AnalyzerResult["language"];
  algorithm?: string;
  hasStructuredInput: boolean;
}): TraceStrategy {
  if (hasStructuredInput && isDeterministicAlgorithm(algorithm)) return "deterministic";
  if ((language === "javascript" || language === "typescript") && !algorithm) return "instrumented-runtime";
  if (language === "cpp" || language === "java") return "trace-hooks";
  return "fallback";
}

function isDeterministicAlgorithm(algorithm?: string) {
  return ["dfs", "bfs", "merge sort", "binary search", "quick sort", "dp"].includes(algorithm ?? "");
}

function getRequiredInput(algorithm?: string) {
  if (algorithm === "dfs" || algorithm === "bfs") return ["nodes", "edges", "source"];
  if (algorithm === "merge sort" || algorithm === "quick sort") return ["nums"];
  if (algorithm === "binary search") return ["nums", "target"];
  if (algorithm === "dp") return ["table", "updates"];
  return [];
}
