import { NextRequest, NextResponse } from "next/server";
import { askGroqJson } from "@/lib/groq";
import type { CodeFlowAnalysisResult } from "@/types/codeflowAnalysis";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      question?: string;
      analysis?: CodeFlowAnalysisResult;
      code?: string;
      stdin?: string;
    };

    if (!body.question?.trim()) {
      return NextResponse.json({ error: "Question is required." }, { status: 400 });
    }

    const answer = await askGroqJson(buildPrompt(body), 900) as { answer?: string };
    return NextResponse.json({ answer: answer.answer ?? "I could not answer that from the current dry run." });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Dry-run chat failed." },
      { status: 500 },
    );
  }
}

function buildPrompt(body: {
  question?: string;
  analysis?: CodeFlowAnalysisResult;
  code?: string;
  stdin?: string;
}) {
  return `You are CodeFlow's dry-run mentor. Answer the student's question using only the current code, input, and analysis data.
Do not invent execution states. If the answer is uncertain, say what is uncertain and how to verify.
Return JSON: {"answer":"short helpful answer"}

Question:
${body.question}

Input:
${body.stdin || "(none)"}

Analysis JSON:
${JSON.stringify(body.analysis ?? {}, null, 2)}

Code:
\`\`\`
${body.code || ""}
\`\`\``;
}
