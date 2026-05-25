import type { TraceResult } from "@/types/trace";

export async function runJavaScriptWithTracing(code: string, input?: unknown): Promise<TraceResult> {
  const warnings = [
    "Server-side JavaScript runtime tracing is not configured.",
    "CodeFlow will not eval arbitrary JavaScript in the production UI.",
  ];

  return {
    success: false,
    strategy: "instrumented-runtime",
    language: "javascript",
    frames: [
      {
        step: 1,
        type: "generic",
        operation: "Runtime tracing backend unavailable",
        explanation:
          "Use trace({ operation, variables, array }) hooks, or configure a sandboxed runner before executing arbitrary code.",
        variables: {
          codeLength: code.length,
          inputProvided: input != null,
        },
        generic: {
          stderr: warnings.join(" "),
          state: { configured: false },
        },
      },
    ],
    warnings,
    fallbackMessage:
      "Instrumented JavaScript execution needs a safe server-side sandbox. This project currently exposes the interface but does not run arbitrary code.",
  };
}
