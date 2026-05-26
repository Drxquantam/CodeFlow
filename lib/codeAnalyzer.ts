import { detectDryRunPattern } from "@/lib/dryRunGenerator";
import type { AnalyzerResult } from "@/types/trace";

export type CodeAnalyzerResult = {
  language: "cpp" | "java" | "python" | "javascript" | "typescript" | "unknown";
  functionNames: string[];
  inputVariables: string[];
  dataStructures: string[];
  hasLoops: boolean;
  hasRecursion: boolean;
  returnVariables: string[];
  likelyPattern: string;
  confidence: number;
};

export function analyzeCodeForDryRun(code: string, languageHint = "unknown"): CodeAnalyzerResult {
  const language = detectLanguage(code, languageHint);
  const functionNames = findFunctionNames(code, language);
  const inputVariables = findInputVariables(code);
  const dataStructures = findDataStructures(code);
  const hasLoops = /\b(for|while|do)\b/.test(code);
  const hasRecursion = functionNames.some((name) => new RegExp(`\\b${escapeRegExp(name)}\\s*\\(`, "g").test(code.replace(functionDeclarationPattern(name), "")));
  const returnVariables = [...code.matchAll(/\breturn\s+([A-Za-z_][\w]*)/g)].map((match) => match[1]);
  const likelyPattern = detectDryRunPattern("", code);
  const confidence = scoreConfidence(code, likelyPattern, dataStructures, hasLoops, hasRecursion);

  return {
    language,
    functionNames,
    inputVariables,
    dataStructures,
    hasLoops,
    hasRecursion,
    returnVariables: [...new Set(returnVariables)],
    likelyPattern,
    confidence,
  };
}

export function analyzeCodeOrQuestion(payload: {
  code?: string;
  question?: string;
  structuredInput?: unknown;
  languageHint?: string;
}): AnalyzerResult {
  const code = payload.code ?? payload.question ?? "";
  const analysis = analyzeCodeForDryRun(code, payload.languageHint ?? "unknown");
  const algorithm = patternToAlgorithm(analysis.likelyPattern, code, payload.structuredInput);
  const hasStructuredInput = payload.structuredInput != null;
  const strategy = hasStructuredInput && analysis.likelyPattern !== "generic"
    ? "deterministic"
    : analysis.language === "javascript" || analysis.language === "typescript"
      ? "instrumented-runtime"
      : "trace-hooks";

  return {
    language: analysis.language,
    algorithm,
    dataStructure: analysis.dataStructures[0],
    confidence: analysis.confidence,
    strategy,
    extractedInput: payload.structuredInput,
    warnings: analysis.likelyPattern === "generic"
      ? ["Pattern not confidently detected. Showing generic step-by-step dry run."]
      : [],
    requiredInput: hasStructuredInput ? [] : requiredInputForPattern(analysis.likelyPattern),
  };
}

function detectLanguage(code: string, hint: string): CodeAnalyzerResult["language"] {
  const normalizedHint = hint.toLowerCase();
  if (normalizedHint.includes("c++") || normalizedHint.includes("cpp")) return "cpp";
  if (normalizedHint.includes("java") && !normalizedHint.includes("javascript")) return "java";
  if (normalizedHint.includes("python")) return "python";
  if (normalizedHint.includes("typescript")) return "typescript";
  if (normalizedHint.includes("javascript")) return "javascript";

  if (/#include|using namespace std|vector<|cout|cin/.test(code)) return "cpp";
  if (/public\s+class|System\.out|static\s+void\s+main/.test(code)) return "java";
  if (/\bdef\s+\w+\s*\(|print\s*\(|:\s*\n\s+/.test(code)) return "python";
  if (/\bconst\b|\blet\b|console\.log|=>/.test(code)) return code.includes(": ") ? "typescript" : "javascript";
  return "unknown";
}

function patternToAlgorithm(pattern: string, code: string, structuredInput: unknown) {
  const inputAlgorithm = asRecord(structuredInput)?.algorithm;
  if (typeof inputAlgorithm === "string" && inputAlgorithm.trim()) return inputAlgorithm;
  const source = code.toLowerCase();

  if (pattern === "binary_search") return "binary search";
  if (pattern === "bfs") return "bfs";
  if (pattern === "dfs_recursion") return source.includes("dfs") ? "dfs" : "recursion";
  if (pattern === "sorting") {
    if (source.includes("quick") || source.includes("partition") || source.includes("pivot")) return "quick sort";
    if (source.includes("merge")) return "merge sort";
    return "sorting";
  }
  if (pattern === "dp") return "dp";
  if (pattern === "graph_shortest_path") return source.includes("bellman") ? "bellman-ford" : "dijkstra";
  return pattern.replace(/_/g, " ");
}

function requiredInputForPattern(pattern: string) {
  if (pattern === "binary_search") return ["nums", "target"];
  if (pattern === "bfs" || pattern === "dfs_recursion") return ["nodes", "edges", "source"];
  if (pattern === "sorting") return ["nums"];
  if (pattern === "dp") return ["table or problem-specific input"];
  return ["input"];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function findFunctionNames(code: string, language: CodeAnalyzerResult["language"]) {
  const names = new Set<string>();
  const patterns =
    language === "python"
      ? [/\bdef\s+([A-Za-z_]\w*)\s*\(/g]
      : [
          /\b(?:int|long|double|float|bool|string|void|auto|vector<[^>]+>|List<[^>]+>|String|boolean)\s+([A-Za-z_]\w*)\s*\(/g,
          /\bfunction\s+([A-Za-z_]\w*)\s*\(/g,
          /\b([A-Za-z_]\w*)\s*=\s*\([^)]*\)\s*=>/g,
        ];

  patterns.forEach((pattern) => {
    for (const match of code.matchAll(pattern)) names.add(match[1]);
  });

  return [...names];
}

function findInputVariables(code: string) {
  const params = [...code.matchAll(/\(([^)]*)\)/g)]
    .flatMap((match) => match[1].split(","))
    .map((part) => part.trim().match(/([A-Za-z_]\w*)\s*(?:=|$)/)?.[1] ?? part.trim().split(/\s+/).at(-1))
    .filter((value): value is string => Boolean(value && /^[A-Za-z_]\w*$/.test(value)));

  const stdinVars = [...code.matchAll(/\bcin\s*>>\s*([A-Za-z_]\w*)/g)].map((match) => match[1]);
  return [...new Set([...params, ...stdinVars])].slice(0, 12);
}

function findDataStructures(code: string) {
  const checks: Array<[string, RegExp]> = [
    ["array/vector", /\b(vector|ArrayList|List|array|nums|arr)\b/i],
    ["map/hash table", /\b(unordered_map|HashMap|Map|dict|frequency|freq)\b/i],
    ["set", /\b(unordered_set|HashSet|Set)\b/i],
    ["queue", /\b(queue|Deque|ArrayDeque)\b/i],
    ["stack", /\b(stack|Stack)\b/i],
    ["heap/priority queue", /\b(priority_queue|heapq|PriorityQueue)\b/i],
    ["graph/adjacency list", /\b(adj|graph|edges)\b/i],
    ["tree", /\b(root|TreeNode|left|right)\b/i],
    ["linked list", /\b(ListNode|head|next|prev)\b/i],
    ["dp table", /\b(dp|memo)\b/i],
  ];

  return checks.filter(([, pattern]) => pattern.test(code)).map(([label]) => label);
}

function scoreConfidence(code: string, pattern: string, dataStructures: string[], hasLoops: boolean, hasRecursion: boolean) {
  let score = pattern === "generic" ? 45 : 65;
  if (dataStructures.length) score += 10;
  if (hasLoops) score += 8;
  if (hasRecursion) score += 8;
  if (code.length > 160) score += 6;
  return Math.min(score, 95);
}

function functionDeclarationPattern(name: string) {
  return new RegExp(`\\b[A-Za-z_][\\w:<>,\\s*&]*\\s+${escapeRegExp(name)}\\s*\\([^)]*\\)`, "g");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
