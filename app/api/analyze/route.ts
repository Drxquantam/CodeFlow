import { NextRequest, NextResponse } from "next/server";
import { analyzeCodeForDryRun } from "@/lib/codeAnalyzer";
import { askGroqJson } from "@/lib/groq";
import { dryRunSchemas, enrichDryRunForAlgorithm } from "@/lib/dryRunGenerator";
import type { CodeFlowAnalysisResult } from "@/types/codeflowAnalysis";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      code?: string;
      language?: string;
      stdin?: string;
    };

    if (!body.code?.trim()) {
      return NextResponse.json({ error: "Code is required." }, { status: 400 });
    }

    const codeAnalysis = analyzeCodeForDryRun(body.code, body.language ?? "unknown");
    const schema = dryRunSchemas[codeAnalysis.likelyPattern as keyof typeof dryRunSchemas];
    const prompt = buildAnalysisPrompt(body.language ?? "unknown", body.code, body.stdin ?? "", schema, codeAnalysis);
    const analysis = await askGroqJson(prompt, 3600) as CodeFlowAnalysisResult;
    return NextResponse.json(enrichDryRunForAlgorithm(analysis, body.stdin ?? "", body.code));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unexpected analysis error.",
      },
      { status: 500 },
    );
  }
}

function buildAnalysisPrompt(
  language: string,
  code: string,
  stdin: string,
  schema: (typeof dryRunSchemas)[keyof typeof dryRunSchemas],
  codeAnalysis: ReturnType<typeof analyzeCodeForDryRun>,
) {
  return `You are CodeFlow, an AI-powered DSA Code Mentor.
Review and analyze this ${language} program for DSA practice.
The code may be LeetCode/GFG style with only a Solution class and no main function. Treat that as valid.

Important rules:
- Return only valid JSON.
- Do not hardcode for one known LeetCode problem. Infer the pattern from the pasted code and input.
- Do not claim you actually executed the code. This is an AI-generated logical dry run.
- If stdin is provided, create a detailed educational dry run from that input.
- If input is missing, dryRun.rows must be [] and dryRun.warnings must include "Input is required for a reliable dry run."
- The dry run must use the selected schema columns exactly.
- Dry run rows must explain line/operation, condition checked, true/false result where relevant, variable change, data-structure change, and why it happens.
- Avoid vague actions such as "loop runs", "function called", "compare", "push", or "update variable". Use specific tutor-style explanations.
- Prefer 10-22 rows when input is provided, unless the input is tiny.
- For every dry-run row, fill every listed column with concrete values or "-".
- variableWatch should include important variables/data structures across meaningful steps.
- snapshots should explain why the next branch/loop/recursive call happens.
- Do not use placeholder or demo values.
- Keep improvedCode in the same language as the user code.
- Do not rewrite code unless it fixes correctness, clarity, or meaningful performance.

Selected dry-run pattern: ${schema.pattern}
Selected dry-run label: ${schema.label}
Use these dry-run columns exactly:
${schema.columns.join(" | ")}

Code analyzer facts:
- language: ${codeAnalysis.language}
- function names: ${codeAnalysis.functionNames.join(", ") || "unknown"}
- input variables: ${codeAnalysis.inputVariables.join(", ") || "unknown"}
- data structures: ${codeAnalysis.dataStructures.join(", ") || "none confidently detected"}
- has loops: ${codeAnalysis.hasLoops ? "yes" : "no"}
- has recursion: ${codeAnalysis.hasRecursion ? "yes" : "no"}
- return variables: ${codeAnalysis.returnVariables.join(", ") || "unknown"}
- pattern confidence: ${codeAnalysis.confidence}/100

Common schema guide:
- binary_search: Low/Mid/High, value checked, condition result, pointer movement.
- sorting: operation/function, indices, comparison, swap/temp/change, array state.
- bfs: current state, neighbor, queue before/after, visited, condition, action.
- dfs_recursion: function call, choice, condition, recursion stack, visited/used.
- dp: state, formula, previous values, updated value, DP state.
- sliding_window: left/right/window, condition, window update, answer update.
- two_pointers: pointer values, condition, pointer movement, answer update.
- stack: current element, stack before/after, popped elements, answer update.
- heap: heap before/after and state update.
- graph_shortest_path: current node, relaxed edge, old/new distance, queue/heap.
- linked_list: current/previous/next and exact pointer change.
- tree: node, traversal direction, stack/queue/recursion, result state.
- generic: operation, condition checked, result, variable changes, data-structure state.

Return JSON with exactly these keys:
{
  "language": "string",
  "detectedAlgorithm": "string",
  "detectedPattern": "${schema.pattern}",
  "inputUsed": "string",
  "codeSummary": "string",
  "review": {
    "bugs": ["string"],
    "qualitySuggestions": ["string"],
    "edgeCaseRisks": ["string"],
    "improvedCode": "string or empty string",
    "scores": {
      "correctness": 0,
      "readability": 0,
      "efficiency": 0,
      "interviewReadiness": 0
    }
  },
  "analysis": {
    "approach": ["string"],
    "timeComplexity": {
      "best": "string or empty string",
      "average": "string or empty string",
      "worst": "string",
      "explanation": "string"
    },
    "spaceComplexity": {
      "value": "string",
      "explanation": "string"
    },
    "betterApproach": "string",
    "interviewExplanation": "string"
  },
  "dryRun": {
    "input": "string",
    "columns": ${JSON.stringify(schema.columns)},
    "rows": [{"${schema.columns[0]}": "string"}],
    "variableWatch": [{"step": 1, "variables": {"name": "value"}}],
    "snapshots": [{"step": 1, "title": "string", "description": "string", "variables": {"name": "value"}}],
    "finalOutput": "string",
    "warnings": ["string"]
  },
  "hiddenTestRisks": ["string"],
  "testCases": [
    {
      "title": "string",
      "input": "string",
      "expectedOutput": "string",
      "explanation": "string",
      "type": "sample"
    }
  ]
}

Test case type must be one of: "sample", "edge", "hidden-risk", "stress".

stdin:
${stdin || "(none)"}

code:
\`\`\`
${code}
\`\`\``;
}
