import { NextRequest, NextResponse } from "next/server";
import { askGroqJson } from "@/lib/groq";

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
    const analysis = await askGroqJson(prompt);
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
  return `Review this ${language} program for DSA practice. Do not pretend to execute it.
Focus on whether the algorithm appears logically correct, what complexity it has, what edge cases may fail, and what state changes would be useful to visualize.
The code may be LeetCode/GFG style with only a Solution class and no main function. Treat that as valid and review the algorithm itself.

Return JSON with exactly these keys:
{
  "approach": "2-4 sentence explanation of what the code is trying to do and whether it looks correct",
  "timeComplexity": "Big-O",
  "timeExplanation": "short explanation",
  "spaceComplexity": "Big-O",
  "spaceBreakdown": [{"name":"string","complexity":"string","reason":"string"}],
  "tleRisk": "low | medium | high",
  "tleExplanation": "short explanation",
  "mistakes": ["specific bug or risk"],
  "edgeCases": ["specific edge case"],
  "testIdeas": ["input idea"],
  "confidence": 0.0
}

stdin:
${stdin || "(none)"}

code:
\`\`\`
${code}
\`\`\``;
}
