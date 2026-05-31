/**
 * Parses the raw Piston/tracer stderr output and converts it into
 * CodeFlowAnalysisResult format so the existing DryRunTable renders it
 * without any UI changes.
 *
 * Output uses the "generic" dry-run schema:
 *   Step | Code/Operation | Condition Checked | Result |
 *   Variable Changes | Data Structure State | Explanation
 */

import type { CodeFlowAnalysisResult } from "@/types/codeflowAnalysis";
import { detectDryRunPattern, dryRunSchemas } from "@/lib/dryRunGenerator";
import type { CodeAnalyzerResult } from "@/lib/codeAnalyzer";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RawTraceStep = {
  step:   number;
  line:   number;
  code:   string;
  vars:   Record<string, unknown>;
  event:  "line" | "return" | "error";
  ret?:   unknown;
  error?: string;
};

type RawTrace = {
  steps: RawTraceStep[];
};

// ─── Parse raw stderr ─────────────────────────────────────────────────────────

const TRACE_MARKER = "__EXEC_TRACE__";

/**
 * Finds the `__EXEC_TRACE__{...}` marker written to stderr and returns the
 * parsed trace.  Returns `null` if the marker isn't present or the JSON is
 * malformed.
 */
export function parseExecutionTrace(stderr: string): RawTrace | null {
  const idx = stderr.indexOf(TRACE_MARKER);
  if (idx === -1) return null;

  try {
    const parsed = JSON.parse(stderr.slice(idx + TRACE_MARKER.length)) as RawTrace;
    if (!Array.isArray(parsed?.steps)) return null;
    return parsed;
  } catch {
    return null;
  }
}

// ─── Value formatter ──────────────────────────────────────────────────────────

function fmtVal(v: unknown, maxLen = 60): string {
  if (v === null || v === undefined) return "None";
  if (v === true)  return "True";
  if (v === false) return "False";
  if (typeof v === "string") {
    const s = v.length > maxLen ? v.slice(0, maxLen) + "…" : v;
    return `"${s}"`;
  }
  if (Array.isArray(v)) {
    if (v.length === 0) return "[]";
    if (v.length > 10)  return `[${v.slice(0, 10).map((x) => fmtVal(x, 12)).join(", ")}, …]`;
    return `[${v.map((x) => fmtVal(x, 20)).join(", ")}]`;
  }
  if (typeof v === "object") {
    const s = JSON.stringify(v);
    return s.length > maxLen ? s.slice(0, maxLen) + "…}" : s;
  }
  return String(v);
}

/** Format a whole variable snapshot compactly. */
function fmtVars(vars: Record<string, unknown>, limit = 6): string {
  const entries = Object.entries(vars).slice(0, limit);
  if (entries.length === 0) return "-";
  return entries.map(([k, v]) => `${k}=${fmtVal(v)}`).join(", ");
}

// ─── Diff helpers ─────────────────────────────────────────────────────────────

function computeChanges(
  prev: Record<string, unknown>,
  curr: Record<string, unknown>,
): string {
  const parts: string[] = [];

  // New variables
  for (const [k, v] of Object.entries(curr)) {
    if (!(k in prev)) {
      parts.push(`${k} = ${fmtVal(v)}`);
    }
  }

  // Changed variables
  for (const [k, v] of Object.entries(curr)) {
    if (k in prev && JSON.stringify(prev[k]) !== JSON.stringify(v)) {
      parts.push(`${k}: ${fmtVal(prev[k])} → ${fmtVal(v)}`);
    }
  }

  return parts.slice(0, 4).join(", ") || "-";
}

// ─── Explanation builder ──────────────────────────────────────────────────────

const COND_RE = /^\s*(if|elif|while)\s+(.+?)(?::.*)?$/;
const FOR_RE  = /^\s*for\s+(.+?)\s+in\s+(.+?)(?::.*)?$/;
const RET_RE  = /^\s*return\b/;
const ASSIGN_RE = /^\s*(\w+)\s*(?:[+\-*/|&^%]=|=(?!=))/;

function buildExplanation(
  step: RawTraceStep,
  changes: string,
  prevVars: Record<string, unknown>,
  steps: RawTraceStep[],
  idx: number,
): string {
  const code = step.code.trim();

  if (step.event === "return") {
    const retVal = fmtVal(step.ret);
    return `Function returns ${retVal === "None" ? "None (no explicit return)" : retVal}. This call is complete.`;
  }

  if (step.event === "error") {
    return `⚠ Runtime error: ${step.error}`;
  }

  // Conditions
  const condMatch = code.match(COND_RE);
  if (condMatch) {
    const keyword   = condMatch[1];
    const condition = condMatch[2];
    // Peek at the next step to infer True/False
    const nextStep = steps[idx + 1];
    const entered  = nextStep && nextStep.line > step.line;
    const result   = entered ? "True → entering block" : "False → skipping block";
    return `${keyword === "while" ? "Loop check" : "Branch"}: \`${condition}\` evaluates to ${result}.`;
  }

  // For-loops
  const forMatch = code.match(FOR_RE);
  if (forMatch) {
    const loopVar = forMatch[1];
    const currVal = step.vars[loopVar];
    return currVal !== undefined
      ? `For-loop: \`${loopVar}\` is now ${fmtVal(currVal)}.`
      : `For-loop iteration over \`${forMatch[2]}\`.`;
  }

  // Return statements (before the actual return event)
  if (RET_RE.test(code)) {
    return `About to return. ${changes !== "-" ? `Return value: ${changes}.` : ""}`;
  }

  // Assignments
  const assignMatch = code.match(ASSIGN_RE);
  if (assignMatch && changes !== "-") {
    return `Assignment: \`${code}\`. ${changes}.`;
  }

  // Generic with changes
  if (changes !== "-") {
    return `\`${code}\` → ${changes}.`;
  }

  return `Executing: \`${code}\`.`;
}

// ─── Filter out noise ─────────────────────────────────────────────────────────

/** Lines we don't want to show in the dry-run table. */
function isInteresting(step: RawTraceStep): boolean {
  if (step.event === "error") return true;
  if (step.event === "return") return true;

  const code = step.code.trim();
  if (!code)                          return false; // blank line
  if (code.startsWith("#"))           return false; // comment
  if (code.startsWith("class "))      return false; // class declaration
  if (/^def\s+\w+\s*\(/.test(code))  return false; // function declaration
  if (code === "pass")                return false;
  if (code.startsWith("from ") || code.startsWith("import ")) return false;

  return true;
}

// ─── Build the DryRun rows ─────────────────────────────────────────────────────

const EXECUTION_COLUMNS = [
  "Step",
  "Code/Operation",
  "Condition Checked",
  "Result",
  "Variable Changes",
  "Data Structure State",
  "Explanation",
] as const;

function buildRows(steps: RawTraceStep[]): Array<Record<string, string>> {
  const interesting = steps.filter(isInteresting);
  const rows: Array<Record<string, string>> = [];
  let prevVars: Record<string, unknown> = {};
  let displayStep = 1;

  for (let i = 0; i < interesting.length; i++) {
    const step = interesting[i];
    const code = step.code.trim();
    const changes = computeChanges(prevVars, step.vars);

    // Condition Checked column
    const condMatch = code.match(COND_RE);
    const forMatch  = code.match(FOR_RE);
    const condText  = condMatch ? condMatch[2] : forMatch ? `${forMatch[1]} in ${forMatch[2]}` : "-";

    // Result column
    let result = "-";
    if (step.event === "return" && step.ret !== undefined) {
      result = `→ ${fmtVal(step.ret)}`;
    } else if (condMatch) {
      const nextStep = interesting[i + 1];
      result = nextStep && nextStep.line > step.line ? "True" : "False";
    }

    const explanation = buildExplanation(step, changes, prevVars, interesting, i);

    rows.push({
      "Step":                String(displayStep++),
      "Code/Operation":      code || "-",
      "Condition Checked":   condText,
      "Result":              result,
      "Variable Changes":    changes,
      "Data Structure State": fmtVars(step.vars),
      "Explanation":         explanation,
    });

    prevVars = step.vars;
  }

  return rows;
}

// ─── Build variableWatch ──────────────────────────────────────────────────────

function buildVarWatch(steps: RawTraceStep[], limit = 12) {
  return steps
    .filter(isInteresting)
    .slice(0, limit)
    .map((s, i) => ({
      step: i + 1,
      variables: Object.fromEntries(
        Object.entries(s.vars)
          .slice(0, 6)
          .map(([k, v]) => [k, fmtVal(v)]),
      ),
    }));
}

// ─── Build snapshots ─────────────────────────────────────────────────────────

function buildSnapshots(steps: RawTraceStep[], limit = 6) {
  const keySteps = steps
    .filter((s) => isInteresting(s) && (
      s.event === "return" ||
      COND_RE.test(s.code.trim()) ||
      FOR_RE.test(s.code.trim()) ||
      steps.indexOf(s) === 0
    ))
    .slice(0, limit);

  return keySteps.map((s, i) => {
    const code = s.code.trim();
    const condM = code.match(COND_RE);
    const title =
      s.event === "return" ? `Return: ${fmtVal(s.ret)}` :
      condM                ? `${condM[1]} ${condM[2]}` :
                             code.slice(0, 50);

    return {
      step:        i + 1,
      title,
      description: buildExplanation(s, computeChanges({}, s.vars), {}, steps, i),
      variables:   Object.fromEntries(
        Object.entries(s.vars).slice(0, 4).map(([k, v]) => [k, fmtVal(v)])
      ),
    };
  });
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Converts a raw execution trace into a complete `CodeFlowAnalysisResult`.
 *
 * The `dryRun.confidence` is set to `"Exact execution trace"` so the UI
 * can distinguish it from AI-generated dry runs.
 */
export function executionTraceToResult(
  trace:        RawTrace,
  code:         string,
  stdin:        string,
  stdout:       string,
  codeAnalysis: CodeAnalyzerResult,
): CodeFlowAnalysisResult {
  const pattern  = detectDryRunPattern(codeAnalysis.likelyPattern, code);
  const schema   = dryRunSchemas[pattern];
  const rows     = buildRows(trace.steps);
  const hasError = trace.steps.some((s) => s.event === "error");

  const errorStep = trace.steps.find((s) => s.event === "error");

  // Final output: prefer stdout from the execution, then the last return value
  const lastReturn = [...trace.steps].reverse().find((s) => s.event === "return");
  const finalOutput =
    stdout.trim() ||
    (lastReturn?.ret !== undefined ? fmtVal(lastReturn.ret) : "");

  const warnings: string[] = [
    "Exact execution trace — every row reflects your code actually running.",
  ];
  if (hasError && errorStep?.error) {
    warnings.push(`Runtime: ${errorStep.error}`);
  }
  if (rows.length === 0 && !hasError) {
    warnings.push(
      "No trace steps captured. Make sure your code produces output for the given input.",
    );
  }

  return {
    language:          codeAnalysis.language,
    detectedAlgorithm: codeAnalysis.likelyPattern.replace(/_/g, " "),
    detectedPattern:   pattern,
    inputUsed:         stdin.trim(),
    codeSummary:       `${schema.label} — exact execution trace from your code and input.`,

    // Minimal review / analysis / testCases — not requested for dry-run focus
    review:   undefined,
    analysis: undefined,

    dryRun: {
      input:        stdin.trim(),
      confidence:   "Exact execution trace",
      columns:      [...EXECUTION_COLUMNS],
      rows,
      variableWatch: buildVarWatch(trace.steps),
      snapshots:    buildSnapshots(trace.steps),
      finalOutput,
      warnings,
    },

    hiddenTestRisks: [],
    testCases:       [],
  };
}
