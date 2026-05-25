import { NextRequest, NextResponse } from "next/server";
import { askGroqJson } from "@/lib/groq";
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

    const prompt = buildAnalysisPrompt(body.language ?? "unknown", body.code, body.stdin ?? "");
    const analysis = await askGroqJson(prompt, 2600) as CodeFlowAnalysisResult;
    return NextResponse.json(analysis);
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

function buildAnalysisPrompt(language: string, code: string, stdin: string) {
  return `You are CodeFlow, an AI-powered DSA Code Mentor.
Review and analyze this ${language} program for DSA practice.
The code may be LeetCode/GFG style with only a Solution class and no main function. Treat that as valid.

Important rules:
- Return only valid JSON.
- Do not invent exact runtime states if you cannot know them.
- If stdin is provided, create a useful dry run from that input.
- If exact dry run depends on runtime/compiler behavior, clearly say "AI-generated dry run; verify with compiler for exact runtime behavior." in dryRun.warnings.
- If input is missing, dryRun.rows should be [] and dryRun.warnings should ask for input.
- Dry run must be detailed: prefer 8-18 rows when input is provided, covering recursive calls, comparisons, assignments, loop updates, queue/stack changes, and output changes.
- For every dry-run row, fill every listed column with concrete values or "-".
- variableWatch should include meaningful variables from several important steps, not only the first step.
- snapshots should explain why the next branch/loop/recursive call happens.
- Do not use placeholder or demo values.
- Keep improvedCode in the same language as the user code.
- Do not rewrite code unless it fixes correctness, clarity, or meaningful performance.

Return JSON with exactly these keys:
{
  "language": "string",
  "detectedAlgorithm": "string",
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
    "columns": ["string"],
    "rows": [{"columnName": "string"}],
    "variableWatch": [{"step": 1, "variables": {"name": "value"}}],
    "snapshots": [{"step": 1, "title": "string", "description": "string", "variables": {"name": "value"}}],
    "finalOutput": "string",
    "warnings": ["string"]
  },
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
Suggested dry-run columns by pattern:
- arrays: Step, i, j, condition, action, array/state, output/ans
- graph BFS/DFS: Step, current node, neighbor checked, visited, queue/stack, action
- recursion: Step, function call, parameters, stack depth, return value, action
- DP: Step, i, j, formula, dp update, table state
- binary search: Step, low, mid, high, nums[mid], condition, action

stdin:
${stdin || "(none)"}

code:
\`\`\`
${code}
\`\`\``;
}
