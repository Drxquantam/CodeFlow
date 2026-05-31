/**
 * Builds an instrumented Python script that:
 *  1. Injects sys.settrace() to record every line + return event.
 *  2. exec()s the user's code inside that tracer.
 *  3. For LeetCode-style class-based code: auto-generates a driver call
 *     from the stdin (expected format: "paramName = value, ...").
 *  4. Writes the JSON trace to stderr so the user's stdout stays clean.
 *
 * The wrapper is sent to the Piston API for actual execution.
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Split a comma-delimited string at the top level (respects brackets). */
function splitTopLevel(s: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if ("([{".includes(ch)) depth++;
    if (")]}".includes(ch)) depth--;
    if (ch === "," && depth === 0) {
      if (cur.trim()) parts.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

/** Convert JS-style literals to Python-style literals. */
function toPythonLiteral(value: string): string {
  return value
    .replace(/\btrue\b/gi, "True")
    .replace(/\bfalse\b/gi, "False")
    .replace(/\bnull\b/gi, "None");
}

/** Parse "key = value, key2 = value2" into a lowercased name→value map. */
function parseNamedArgs(stdin: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const part of splitTopLevel(stdin.trim())) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim().toLowerCase();
    const val = toPythonLiteral(part.slice(eq + 1).trim());
    if (key) map.set(key, val);
  }
  return map;
}

/** Extract the first public method name + parameter names from a Solution class. */
function parseSolutionMethod(code: string): { name: string; params: string[] } | null {
  const m = code.match(
    /class\s+Solution[\s\S]*?def\s+([a-zA-Z_]\w*)\s*\(\s*self\s*(?:,\s*([^)]*))?\s*\)/m,
  );
  if (!m) return null;
  const params = (m[2] ?? "")
    .split(",")
    .map((p) => p.trim().split(":")[0].trim().split("=")[0].trim())
    .filter(Boolean);
  return { name: m[1], params };
}

/** Common param-name aliases so we can match "n" to "num", "t" to "target", etc. */
const PARAM_ALIASES: Record<string, string[]> = {
  nums:   ["num", "arr", "array", "a", "b", "numbers", "values"],
  target: ["t", "k", "goal", "sum", "val", "x", "q"],
  s:      ["string", "str", "word", "text", "t"],
  n:      ["size", "len", "num", "count", "m"],
  k:      ["steps", "count", "times", "m"],
  head:   ["node", "list", "l"],
  root:   ["tree", "node"],
  matrix: ["grid", "board", "m"],
  grid:   ["matrix", "board", "m"],
};

/**
 * Generates a Python try/except driver block that instantiates Solution and
 * calls the first method with the parsed stdin arguments.
 * Returns "" if a driver can't be built.
 */
function buildDriver(code: string, stdin: string): string {
  const method = parseSolutionMethod(code);
  if (!method) return "";

  const named = parseNamedArgs(stdin);
  const args: string[] = [];

  for (const param of method.params) {
    const lower = param.toLowerCase();
    // Try exact match first
    let value = named.get(lower);

    // Try aliases
    if (!value) {
      for (const alias of PARAM_ALIASES[lower] ?? []) {
        value = named.get(alias);
        if (value) break;
      }
    }

    // Fallback: next unused value from the named map
    if (!value) {
      const unused = [...named.values()].filter((v) => !args.includes(v));
      value = unused[0];
    }

    if (!value) return ""; // Can't infer this argument — give up
    args.push(value);
  }

  const call = `__sol.${method.name}(${args.join(", ")})`;
  return [
    "# ── Auto-generated driver ──",
    "try:",
    "    __sol = Solution()",
    `    __out = ${call}`,
    "    print(repr(__out))",
    "except Exception as __de:",
    "    print('[driver error]', __de)",
  ].join("\n");
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Builds the instrumented Python wrapper script.
 *
 * The user's code is base64-encoded so that any quotes, backslashes, or
 * triple-quote strings inside it don't break the outer script.
 *
 * The trace is written to **stderr** as:
 *   __EXEC_TRACE__{"steps":[...]}
 *
 * so the user's stdout (print() calls) stays separate.
 */
export function buildPythonTracerCode(userCode: string, stdin: string): string {
  const b64Code    = Buffer.from(userCode).toString("base64");
  const linesJson  = JSON.stringify(userCode.split("\n"));

  const isLeetCode =
    /^\s*class\s+Solution\s*:/m.test(userCode) && !/\binput\s*\(/.test(userCode);

  const driver = isLeetCode ? buildDriver(userCode, stdin) : "";

  return `\
from typing import *
from collections import *
import sys as __sys, json as __json, base64 as __b64
import heapq, bisect, math, itertools, functools, operator

# ── Tracer ────────────────────────────────────────────────────────────────────
__TRACE  = []
__MAX    = 50
__LINES  = ${linesJson}

def __safe(v):
    """Serialize v to a JSON-safe value; fall back to repr."""
    try:
        __json.dumps(v)
        return v
    except Exception:
        try:
            r = repr(v)
            return r[:200] + ("…" if len(r) > 200 else "")
        except Exception:
            return "<unprintable>"

def __snap(locals_dict):
    """Snapshot local variables, skipping internals and 'self'."""
    out = {}
    for k, v in locals_dict.items():
        if k.startswith("__") or k in ("self", "__sol", "__out", "__de", "__xe", "__se"):
            continue
        out[k] = __safe(v)
    return out

def __tracer(frame, event, arg):
    global __TRACE
    if len(__TRACE) >= __MAX:
        return None
    # Only trace frames from the user's solution (compiled as "solution.py")
    if frame.f_code.co_filename != "solution.py":
        return __tracer
    if event not in ("line", "return"):
        return __tracer
    li = frame.f_lineno
    lc = __LINES[li - 1].rstrip() if 0 < li <= len(__LINES) else ""
    entry = {
        "step":  len(__TRACE) + 1,
        "line":  li,
        "code":  lc,
        "vars":  __snap(frame.f_locals),
        "event": event,
    }
    if event == "return" and arg is not None:
        entry["ret"] = __safe(arg)
    __TRACE.append(entry)
    return __tracer

# ── Run user code ─────────────────────────────────────────────────────────────
__user_code = __b64.b64decode("${b64Code}").decode("utf-8")

__sys.settrace(__tracer)

try:
    exec(compile(__user_code, "solution.py", "exec"))
    ${driver || "# (competitive-programming style — no driver needed)"}
except SyntaxError as __se:
    __sys.settrace(None)
    __TRACE.insert(0, {"step": 0, "line": 0, "code": "", "vars": {}, "event": "error",
                       "error": f"Syntax error: {__se}"})
except Exception as __xe:
    __sys.settrace(None)
    __TRACE.append({"step": len(__TRACE) + 1, "line": 0, "code": "", "vars": {},
                    "event": "error", "error": str(__xe)})
else:
    __sys.settrace(None)

# Write trace to stderr (keeps stdout clean for the user's print() output)
__sys.stderr.write("__EXEC_TRACE__" + __json.dumps({"steps": __TRACE}))
`;
}
