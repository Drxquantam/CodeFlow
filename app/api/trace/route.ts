import { NextRequest, NextResponse } from "next/server";
import { generateTraceFromAnalysis } from "@/lib/algorithmMapper";
import { analyzeCodeOrQuestion } from "@/lib/codeAnalyzer";
import { askGroqJson } from "@/lib/groq";
import { normalizeInputForVisualizer } from "@/lib/inputNormalizer";

export type TraceStep = {
  step: number;
  line: number;
  action: string;
  variables: Record<string, string | number | boolean>;
  output?: string;
  note: string;
  activeNodes?: string[];
  activeEdges?: string[];
  visitedNodes?: string[];
};

export type VisualNode = {
  id: string;
  label: string;
  group?: string;
};

export type VisualEdge = {
  from: string;
  to: string;
  label?: string;
};

export type TraceResponse = {
  summary: string;
  steps: TraceStep[];
  nodes: VisualNode[];
  edges: VisualEdge[];
  visualType: "array" | "linked-list" | "tree" | "graph" | "grid" | "queue" | "stack" | "dp" | "recursion" | "flow";
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      code?: string;
      question?: string;
      language?: string;
      languageHint?: string;
      stdin?: string;
      structuredInput?: unknown;
      mode?: string;
    };

    if (body.mode === "universal" || body.structuredInput != null || body.question) {
      const analysis = analyzeCodeOrQuestion({
        code: body.code,
        question: body.question,
        structuredInput: body.structuredInput,
        languageHint: body.languageHint ?? body.language,
      });
      const result = await generateTraceFromAnalysis({
        analysis,
        structuredInput: body.structuredInput,
        code: body.code,
      });

      return NextResponse.json(result);
    }

    if (!body.code?.trim()) {
      return NextResponse.json({ error: "Code is required." }, { status: 400 });
    }

    const trace = (await askGroqJson(
      buildTracePrompt(
        body.language ?? "unknown",
        body.code,
        normalizeInputForVisualizer(body.stdin ?? ""),
      ),
      2200,
    )) as TraceResponse;

    return NextResponse.json(normalizeTrace(trace));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected trace error." },
      { status: 500 },
    );
  }
}

function buildTracePrompt(language: string, code: string, stdin: string) {
  return `Create a dry run and visualization model for this ${language} code.

Return JSON with exactly these keys:
{
  "summary": "one sentence describing what is traced",
  "visualType": "array | linked-list | tree | graph | grid | queue | stack | dp | recursion | flow",
  "steps": [
    {
      "step": 1,
      "line": 1,
      "action": "what happens",
      "variables": {"name": "value"},
      "output": "optional output so far",
      "note": "short explanation",
      "activeNodes": ["node id being processed now"],
      "activeEdges": ["from->to edge being used now"],
      "visitedNodes": ["nodes/items already completed"]
    }
  ],
  "nodes": [{"id":"n1","label":"start","group":"optional"}],
  "edges": [{"from":"n1","to":"n2","label":"optional"}]
}

Rules:
- Produce 5 to 12 trace steps.
- Use the provided stdin where possible.
- If exact execution is impossible, produce the most faithful symbolic dry run.
- Keep variable values short.
- Choose the most specific visualType:
  - graph for graph traversal, topological sort, shortest path, alien dictionary
  - linked-list for ListNode traversal/reversal/merge/cycle
  - tree for binary tree / trie / heap
  - grid for matrix BFS/DFS/DP
  - array for sorting, two pointers, prefix sums, sliding window
  - queue or stack when the main data structure is the animation focus
  - dp for table transitions
  - recursion for call stack / backtracking
- Nodes and edges should visualize the real data structure, not generic control flow, unless no structure can be inferred.
- For directed graphs or topological sort, edges must be directed from dependency to dependent and activeEdges must match "from->to".
- For alien dictionary, nodes are characters and edges come only from first differing characters in adjacent words.
- Use stable node ids. For graph input, prefer ids like "1", "2", "3". For array input, prefer ids like "a0", "a1".
- activeNodes must reference ids from nodes.
- activeEdges must use "from->to" ids that match edges.
- visitedNodes should grow as the trace progresses.

stdin:
${stdin || "(none)"}

code:
\`\`\`
${code}
\`\`\``;
}

function normalizeTrace(trace: TraceResponse): TraceResponse {
  return {
    summary: trace.summary || "Generated dry run for the current code.",
    visualType: trace.visualType || "flow",
    steps: Array.isArray(trace.steps) ? trace.steps.slice(0, 12) : [],
    nodes: Array.isArray(trace.nodes) ? trace.nodes.slice(0, 16) : [],
    edges: Array.isArray(trace.edges) ? trace.edges.slice(0, 24) : [],
  };
}
