import { NextRequest, NextResponse } from "next/server";
import { generateTraceFromAnalysis } from "@/lib/algorithmMapper";
import { analyzeCodeOrQuestion } from "@/lib/codeAnalyzer";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      code?: string;
      question?: string;
      structuredInput?: unknown;
      languageHint?: string;
    };

    const analysis = analyzeCodeOrQuestion(body);
    const result = await generateTraceFromAnalysis({
      analysis,
      structuredInput: body.structuredInput,
      code: body.code,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        strategy: "fallback",
        frames: [],
        errors: [error instanceof Error ? error.message : "Unexpected trace error."],
        fallbackMessage: "Unable to generate a trace from the provided payload.",
      },
      { status: 400 },
    );
  }
}
