import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CodeFlowAnalysisResult } from "@/types/codeflowAnalysis";

export const boilerplates = {
  "C++": `#include <bits/stdc++.h>
using namespace std;

int main() {
    // Write your code here
    return 0;
}`,
  Java: `import java.util.*;

class Main {
    public static void main(String[] args) {
        // Write your code here
    }
}`,
  Python: `def main():
    # Write your code here
    pass


if __name__ == "__main__":
    main()`,
  JavaScript: `function main() {
  // Write your code here
}

main();`,
} as const;

export type SupportedLanguage = keyof typeof boilerplates;

type RunStatus = "idle" | "running" | "success" | "error";

export type SubmissionRecord = {
  id: string;
  language: SupportedLanguage;
  code: string;
  stdin: string;
  output: string;
  runtime: string;
  memory: string;
  verdict: "Analyzed" | "Needs Review" | "Analysis Error";
  createdAt: string;
};

export type CodeReview = CodeFlowAnalysisResult;

type AlgoStore = {
  code: string;
  stdin: string;
  output: string;
  runtime: string;
  memory: string;
  status: RunStatus;
  lastReview: CodeReview | null;
  language: SupportedLanguage;
  history: SubmissionRecord[];
  sessionId: string;
  historyStatus: "idle" | "loading" | "ready" | "error";
  historyError: string;
  setCode: (code: string) => void;
  setStdin: (stdin: string) => void;
  setLanguage: (language: SupportedLanguage) => void;
  clearHistory: () => Promise<void>;
  loadHistory: () => Promise<void>;
  reviewCode: () => void;
  resetCode: () => void;
};

export const useAlgoStore = create<AlgoStore>()(
  persist(
    (set, get) => ({
  code: boilerplates["C++"],
  stdin: "",
  output: "",
  runtime: "not executed",
  memory: "static review",
  status: "idle",
  lastReview: null,
  language: "C++",
  history: [],
  sessionId: createClientId(),
  historyStatus: "idle",
  historyError: "",
  setCode: (code) => set({ code }),
  setStdin: (stdin) => set({ stdin }),
  setLanguage: (language) =>
    set({
      language,
      code: boilerplates[language],
      output: "",
      runtime: "not executed",
      memory: "static review",
      status: "idle",
      lastReview: null,
    }),
  clearHistory: async () => {
    const { sessionId } = get();
    set({ history: [], historyError: "" });

    try {
      const response = await fetch(`/api/submissions?sessionId=${encodeURIComponent(sessionId)}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error ?? "Could not clear database history.");
      }
    } catch (error) {
      set({
        historyError:
          error instanceof Error ? error.message : "Could not clear database history.",
      });
    }
  },
  loadHistory: async () => {
    const { sessionId } = get();
    set({ historyStatus: "loading", historyError: "" });

    try {
      const response = await fetch(`/api/submissions?sessionId=${encodeURIComponent(sessionId)}`);
      const result = (await response.json()) as {
        submissions?: SubmissionRecord[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error ?? "Could not load database history.");
      }

      set({
        history: result.submissions ?? [],
        historyStatus: "ready",
        historyError: "",
      });
    } catch (error) {
      set({
        historyStatus: "error",
        historyError:
          error instanceof Error ? error.message : "Could not load database history.",
      });
    }
  },
  reviewCode: async () => {
    const { code, language, stdin } = get();
    set({ status: "running", output: `Reviewing ${language} code...` });

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language, stdin }),
      });
      const result = (await response.json()) as CodeReview & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error ?? "Code review failed.");
      }

      const output = [
        "AI Code Review",
        "",
        `Algorithm: ${result.detectedAlgorithm ?? "Unknown"}`,
        `Correctness: ${result.review?.scores?.correctness ?? "-"}/10`,
        `Readability: ${result.review?.scores?.readability ?? "-"}/10`,
        `Efficiency: ${result.review?.scores?.efficiency ?? "-"}/10`,
        `Worst-case time: ${result.analysis?.timeComplexity?.worst ?? "Unknown"}`,
        `Space: ${result.analysis?.spaceComplexity?.value ?? "Unknown"}`,
        "",
        "Summary:",
        result.codeSummary ?? "No summary returned.",
        "",
        "Interview explanation:",
        result.analysis?.interviewExplanation ?? "No interview explanation returned.",
        "",
        "Likely issues:",
        ...(result.review?.bugs?.length ? result.review.bugs.map((item) => `- ${item}`) : ["- No obvious issue found."]),
        "",
        "Edge cases to test:",
        ...(result.review?.edgeCaseRisks?.length ? result.review.edgeCaseRisks.map((item) => `- ${item}`) : ["- Add boundary and empty-input cases."]),
      ]
        .filter(Boolean)
        .join("\n");
      const runtime = result.analysis?.timeComplexity?.worst ?? "static";
      const memory = result.analysis?.spaceComplexity?.value ?? "static";
      const verdict = (result.review?.scores?.correctness ?? 0) >= 7 ? "Analyzed" : "Needs Review";
      const submission = createSubmission({
        code,
        language,
        stdin,
        output,
        runtime,
        memory,
        verdict,
      });

      set({
        status: "success",
        output,
        runtime,
        memory,
        lastReview: result,
        history: [submission, ...get().history].slice(0, 50),
      });
      void persistSubmission(submission, get().sessionId, set);
    } catch (error) {
      const output =
        error instanceof Error
          ? `Analysis error: ${error.message}`
          : "Analysis error: unknown failure.";
      const submission = createSubmission({
        code,
        language,
        stdin,
        output,
        runtime: "not executed",
        memory: "static review",
        verdict: "Analysis Error",
      });
      set({
        status: "error",
        output,
        runtime: "not executed",
        memory: "static review",
        lastReview: null,
        history: [submission, ...get().history].slice(0, 50),
      });
      void persistSubmission(submission, get().sessionId, set);
    }
  },
  resetCode: () =>
    set({
      code: boilerplates[get().language],
      output: "",
      runtime: "not executed",
      memory: "static review",
      lastReview: null,
      status: "idle",
    }),
}),
    {
      name: "codeflow-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ history: state.history, sessionId: state.sessionId }),
    },
  ),
);

function createSubmission(input: Omit<SubmissionRecord, "id" | "createdAt">): SubmissionRecord {
  return {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
}

function createClientId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function persistSubmission(
  submission: SubmissionRecord,
  sessionId: string,
  set: (partial: Partial<AlgoStore>) => void,
) {
  try {
    const response = await fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...submission, sessionId }),
    });

    if (!response.ok) {
      const result = (await response.json()) as { error?: string };
      throw new Error(result.error ?? "Could not save database submission.");
    }
  } catch (error) {
    set({
      historyError:
        error instanceof Error ? error.message : "Could not save database submission.",
    });
  }
}
