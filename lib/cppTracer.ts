/**
 * Builds an instrumented C++ program that traces its own execution.
 *
 * Strategy
 * ─────────
 * 1. Inject a tiny `namespace __t` trace library at the top of the file
 *    (formatters for int/bool/string/vector/map/set/pair, snap(), emit()).
 * 2. Walk the source line-by-line, tracking brace-depth and every variable
 *    declaration that is in scope.
 * 3. After each "interesting" statement (assignment, loop header, condition,
 *    return) inject a `__t::snap()` call that logs the variables on that line
 *    plus everything in the current scope.
 * 4. For LeetCode-style code (class Solution, no main) generate a main() that
 *    parses the stdin and calls the first method.
 * 5. Add `__t::emit()` just before `return 0` in main so the trace reaches
 *    stderr after all stdout output is flushed.
 *
 * The trace is written to **stderr** as:
 *   __EXEC_TRACE__{"steps":[...]}
 */

// ─── C++ trace library (injected verbatim at the top of every submission) ────

const CPP_TRACE_LIB = `
#include <bits/stdc++.h>
using namespace std;

namespace __t {

// ── Formatters ───────────────────────────────────────────────────────────────
// Forward declarations so recursive templates compile
template<typename T> string f(const T&);

// Escape a string so it is safe inside a JSON string value
static string esc(const string& s) {
    string r; r.reserve(s.size() + 4);
    for (unsigned char c : s) {
        if      (c == '"')  r += "\\\\\\"";
        else if (c == '\\\\') r += "\\\\\\\\";
        else if (c == '\\n') r += "\\\\n";
        else if (c == '\\r') r += "\\\\r";
        else if (c < 32)    r += '?';
        else                r += c;
    }
    return r;
}

// Primitive fallback — works for int, long, double, char, size_t …
template<typename T>
string f(const T& v) { ostringstream s; s << boolalpha << v; return s.str(); }

// Specialisations that must come before the generic template when instantiated
static string f(bool v)               { return v ? "true" : "false"; }
static string f(const string& v)      { return "\\"" + esc(v) + "\\""; }
static string f(const char* v)        { return v ? "\\"" + esc(v) + "\\"" : "null"; }

template<typename T>
static string f(const vector<T>& v) {
    if (v.empty()) return "[]";
    ostringstream s; s << "[";
    size_t n = min(v.size(), (size_t)12);
    for (size_t i = 0; i < n; i++) { if (i) s << ","; s << f(v[i]); }
    if (v.size() > n) s << ",...";
    s << "]"; return s.str();
}

template<typename T>
static string f(const vector<vector<T>>& v) {
    if (v.empty()) return "[]";
    ostringstream s; s << "[";
    size_t n = min(v.size(), (size_t)6);
    for (size_t i = 0; i < n; i++) { if (i) s << ","; s << f(v[i]); }
    if (v.size() > n) s << ",...";
    s << "]"; return s.str();
}

template<typename K, typename V>
static string f(const map<K,V>& m) {
    if (m.empty()) return "{}";
    ostringstream s; s << "{"; int n = 0;
    for (const auto& [k, v] : m) {
        if (n++ > 8) { s << ",..."; break; }
        if (n > 1) s << ","; s << f(k) << ":" << f(v);
    }
    s << "}"; return s.str();
}

template<typename K, typename V>
static string f(const unordered_map<K,V>& m) {
    if (m.empty()) return "{}";
    ostringstream s; s << "{"; int n = 0;
    for (const auto& [k, v] : m) {
        if (n++ > 8) { s << ",..."; break; }
        if (n > 1) s << ","; s << f(k) << ":" << f(v);
    }
    s << "}"; return s.str();
}

template<typename T>
static string f(const set<T>& v) {
    if (v.empty()) return "{}";
    ostringstream s; s << "{"; int n = 0;
    for (const auto& x : v) { if (n++ > 8) { s << ",..."; break; } if (n > 1) s << ","; s << f(x); }
    s << "}"; return s.str();
}

template<typename T>
static string f(const unordered_set<T>& v) {
    if (v.empty()) return "{}";
    ostringstream s; s << "{"; int n = 0;
    for (const auto& x : v) { if (n++ > 8) { s << ",..."; break; } if (n > 1) s << ","; s << f(x); }
    s << "}"; return s.str();
}

template<typename T>
static string f(const deque<T>& v) {
    if (v.empty()) return "[]";
    ostringstream s; s << "[";
    size_t n = min(v.size(), (size_t)10);
    for (size_t i = 0; i < n; i++) { if (i) s << ","; s << f(v[i]); }
    if (v.size() > n) s << ",...";
    s << "]"; return s.str();
}

template<typename A, typename B>
static string f(const pair<A,B>& p) { return "(" + f(p.first) + "," + f(p.second) + ")"; }

// ── Trace storage ─────────────────────────────────────────────────────────────
static int  step = 0;
static bool done = false;
static const int MAX = 50;

struct Entry { int s, l; string code, vars; };
static vector<Entry> log;

static void snap(int line, const char* code,
                 initializer_list<pair<const char*, string>> kv) {
    if (done || step >= MAX) { done = true; return; }
    ostringstream vs; vs << "{";
    bool first = true;
    for (const auto& [k, v] : kv) {
        if (!first) vs << ",";
        first = false;
        vs << "\\"" << k << "\\":\\"" << esc(v) << "\\"";
    }
    vs << "}";
    log.push_back({++step, line, string(code), vs.str()});
}

static void emit() {
    cerr << "__EXEC_TRACE__{\\"steps\\":[";
    for (size_t i = 0; i < log.size(); i++) {
        if (i) cerr << ",";
        const auto& e = log[i];
        cerr << "{\\"step\\":" << e.s
             << ",\\"line\\":" << e.l
             << ",\\"code\\":\\"" << esc(e.code) << "\\""
             << ",\\"vars\\":" << e.vars
             << ",\\"event\\":\\"line\\"}";
    }
    cerr << "]}";
}

} // namespace __t
`;

// ─── TypeScript helpers ────────────────────────────────────────────────────────

const CPP_KEYWORDS = new Set([
  "alignas","alignof","and","and_eq","asm","auto","bitand","bitor","bool","break",
  "case","catch","char","char8_t","char16_t","char32_t","class","compl","concept",
  "const","consteval","constexpr","constinit","const_cast","continue","co_await",
  "co_return","co_yield","decltype","default","delete","do","double","dynamic_cast",
  "else","enum","explicit","export","extern","false","float","for","friend","goto",
  "if","inline","int","long","mutable","namespace","new","noexcept","not","not_eq",
  "nullptr","operator","or","or_eq","private","protected","public","register",
  "reinterpret_cast","requires","return","short","signed","sizeof","static",
  "static_assert","static_cast","struct","switch","template","this","thread_local",
  "throw","true","try","typedef","typeid","typename","union","unsigned","using",
  "virtual","void","volatile","wchar_t","while","xor","xor_eq",
  // Common STL names we don't want to log
  "vector","map","set","deque","stack","queue","pair","string","tuple",
  "unordered_map","unordered_set","priority_queue","multimap","multiset",
  "cout","cin","cerr","endl","sort","min","max","abs","swap","push_back",
  "pop_back","push","pop","front","back","begin","end","size","empty",
  "find","count","insert","erase","clear","make_pair","make_tuple","get",
  "lower_bound","upper_bound","reverse","accumulate","fill","copy","move",
  "printf","scanf","sprintf","fprintf","strlen","strcmp","strcpy","memset",
  "INT_MAX","INT_MIN","LLONG_MAX","LLONG_MIN","MOD","INF","PI",
  "bits","stdc","__t",
]);

/** All C++ identifiers on `line`, excluding keywords and lib names. */
function extractIds(line: string): string[] {
  const ids: string[] = [];
  for (const m of line.matchAll(/\b([a-zA-Z_]\w*)\b/g)) {
    const id = m[1];
    if (!CPP_KEYWORDS.has(id) && !id.startsWith("__")) {
      ids.push(id);
    }
  }
  return [...new Set(ids)];
}

/** Build a `__t::snap(...)` injection string for the given source line. */
function snapCall(lineNo: number, codeLine: string, vars: string[]): string {
  const safe = codeLine.trim().replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const pairs = vars
    .slice(0, 8)
    .map((v) => `{"${v}", __t::f(${v})}`)
    .join(", ");
  return `  if(!__t::done)__t::snap(${lineNo},"${safe}",{${pairs}});`;
}

// ─── Scope-aware variable tracker ────────────────────────────────────────────

type ScopeVar = { name: string; depth: number };

/** Type prefixes that introduce a new variable declaration. */
const TYPE_DECL_RE =
  /^\s*(?:(?:const|static|long|unsigned|short|signed|inline)\s+)*(?:int|long|double|float|bool|char|string|auto|size_t|ssize_t|ll|ull|ld|[\w:]+(?:\s*<[^>]*>)?)\s+(\w+)\s*(?:[=({,;])/;

/** `for (int i = ...)` loop variable. */
const FOR_VAR_RE = /^\s*for\s*\(\s*(?:(?:const|auto|int|long|[\w:]+(?:<[^>]*>)?)\s+)?(\w+)\s*[=:]/;

function extractDeclaredName(line: string): string | null {
  const fm = line.match(FOR_VAR_RE);
  if (fm) return fm[1];
  const m = line.match(TYPE_DECL_RE);
  return m?.[1] ?? null;
}

// ─── Core instrumentation ─────────────────────────────────────────────────────

function instrumentCode(code: string): string {
  const lines = code.split("\n");
  const result: string[] = [];
  const scope: ScopeVar[] = [];
  let depth = 0;

  /** Variables currently in scope. */
  const inScopeNames = () => [...new Set(scope.map((v) => v.name))];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const lineNo = i + 1;

    // Count brace changes BEFORE we emit this line
    const opens  = (line.match(/{/g)  ?? []).length;
    const closes = (line.match(/}/g)  ?? []).length;

    // Pop out-of-scope vars on closing braces
    if (closes > 0) {
      const newDepth = Math.max(0, depth - closes);
      scope.splice(0, scope.length, ...scope.filter((v) => v.depth <= newDepth));
      depth = newDepth;
    }

    // Emit the original line first
    result.push(line);

    // Check for new declaration
    const declName = extractDeclaredName(trimmed);
    if (declName && !CPP_KEYWORDS.has(declName)) {
      scope.push({ name: declName, depth: depth + opens });
    }

    depth += opens;

    // ── Decide whether to inject a trace ──────────────────────────────────
    const shouldTrace = (
      // Skip blank lines, comments, preprocessor, class/struct/namespace/using lines
      trimmed.length > 0 &&
      !trimmed.startsWith("//") &&
      !trimmed.startsWith("#") &&
      !trimmed.startsWith("/*") &&
      !trimmed.startsWith("*") &&
      !/^\s*(?:class|struct|namespace|using|template|public:|private:|protected:)\b/.test(trimmed) &&
      // Only trace inside function bodies (depth ≥ 2: class body + method body, or just ≥ 1 for plain main)
      depth >= 1 &&
      (
        // Assignments (but not == or !=)
        /\b\w+\s*(?:[+\-*\/%|&^]=|=(?!=))/.test(trimmed) ||
        // For/while loop headers
        /^\s*(?:for|while)\s*\(/.test(trimmed) ||
        // If / else if conditions
        /^\s*(?:if|else\s*if)\s*\(/.test(trimmed) ||
        // Return statements
        /^\s*return\b/.test(trimmed)
      )
    );

    if (shouldTrace) {
      // Variables: union of vars mentioned on this line + all in-scope vars
      const lineIds  = extractIds(trimmed);
      const scopeIds = inScopeNames();
      const vars     = [...new Set([...lineIds, ...scopeIds])].filter(
        (v) => !CPP_KEYWORDS.has(v),
      );

      result.push(snapCall(lineNo, trimmed, vars));
    }
  }

  return result.join("\n");
}

// ─── LeetCode driver generator ────────────────────────────────────────────────

/** Splits a comma-separated string at top level (respects brackets). */
function splitTopLevel(s: string): string[] {
  const parts: string[] = [];
  let depth = 0, cur = "";
  for (const ch of s) {
    if ("([{".includes(ch)) depth++;
    if (")]}".includes(ch)) depth--;
    if (ch === "," && depth === 0) { if (cur.trim()) parts.push(cur.trim()); cur = ""; }
    else cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

/** Convert Python/JSON array `[1,2,3]` to C++ initialiser `{1,2,3}`. */
function toCppLiteral(value: string): string {
  return value
    .replace(/\[/g, "{").replace(/\]/g, "}")
    .replace(/\btrue\b/gi, "true").replace(/\bfalse\b/gi, "false")
    .replace(/\bnull\b/gi, "0");
}

/** Parse "key=value, key2=value2" stdin into a name→cpp-literal map. */
function parseNamedArgs(stdin: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const part of splitTopLevel(stdin.trim())) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim().toLowerCase();
    const val = toCppLiteral(part.slice(eq + 1).trim());
    if (key) m.set(key, val);
  }
  return m;
}

/** Extract first public method of Solution class. */
function parseSolutionMethod(
  code: string,
): { returnType: string; name: string; params: Array<{ type: string; name: string }> } | null {
  const m = code.match(
    /(?:public\s*:[\s\S]*?)?(?:[\w:]+(?:\s*<[^>]*>)?)\s+([\w]+)\s*\(\s*([^)]*)\s*\)\s*\{/,
  );
  if (!m) return null;

  const name = m[1];
  if (["Solution", "constructor", "class"].includes(name)) return null;

  const rawParams = m[2];
  const params: Array<{ type: string; name: string }> = [];
  for (const param of splitTopLevel(rawParams)) {
    const parts = param.trim().split(/\s+/);
    if (parts.length >= 2) {
      const pName = parts.at(-1)?.replace(/[&*]/g, "") ?? "";
      const pType = parts.slice(0, -1).join(" ").replace(/&$/,"").trim();
      if (pName) params.push({ type: pType, name: pName });
    }
  }

  // infer return type (very rough)
  const rtMatch = code.match(
    new RegExp(`((?:int|long|bool|double|string|void|vector\\s*<[^>]*>|\\w+)\\s+)${name}\\s*\\(`),
  );
  const returnType = rtMatch?.[1]?.trim() ?? "auto";

  return { returnType, name, params };
}

/** Infer a C++ type from the stdin value. */
function inferCppType(value: string): string {
  if (/^\{[-\d, .]+\}$/.test(value)) return "vector<int>";
  if (/^\{\{/.test(value))           return "vector<vector<int>>";
  if (/^"/.test(value))              return "string";
  if (/^(true|false)$/.test(value))  return "bool";
  if (/^-?\d+\.\d+$/.test(value))   return "double";
  return "long long";
}

/** Emit a result of any common type to stdout. */
const PRINT_RESULT = `
  // print result
  if constexpr (requires { cout << __out; }) {
    cout << __out << "\\n";
  }
`.trim();

/**
 * For LeetCode-style code (class Solution + no main), generate a main()
 * that parses stdin named args and calls the first Solution method.
 */
function buildCppDriver(code: string, stdin: string): string {
  const hasMain = /\bint\s+main\s*\(/.test(code);
  if (hasMain) return "";

  const method = parseSolutionMethod(code);
  if (!method) return "";

  const named = parseNamedArgs(stdin);

  const ALIASES: Record<string, string[]> = {
    nums: ["num","arr","array","a","b","numbers","values"],
    target: ["t","k","goal","sum","val","x","q"],
    s: ["string","str","word","text","t"],
    n: ["size","len","num","count","m"],
    k: ["steps","count","times","m"],
    head: ["node","list","l"],
    root: ["tree","node"],
    matrix: ["grid","board","m"],
    grid: ["matrix","board","m"],
  };

  const decls: string[] = [];
  const callArgs: string[] = [];

  for (const param of method.params) {
    const pName  = param.name;
    const pLower = pName.toLowerCase();
    let value    = named.get(pLower);

    if (!value) {
      for (const alias of ALIASES[pLower] ?? []) {
        value = named.get(alias);
        if (value) break;
      }
    }
    if (!value) {
      // Use next unconsumed value from stdin
      const unused = [...named.values()].filter((v) => !callArgs.includes(v));
      value = unused[0];
    }
    if (!value) return ""; // can't build driver

    const cppType = param.type.includes("vector")
      ? param.type.replace(/&/g, "").trim()
      : (param.type.includes("string") ? "string" : inferCppType(value));

    decls.push(`  ${cppType} ${pName} = ${value};`);
    callArgs.push(pName);
  }

  const call      = `sol.${method.name}(${callArgs.join(", ")})`;
  const retType   = method.returnType;
  const printLine = retType === "void"
    ? `  ${call};`
    : `  auto __out = ${call};\n  cout << __t::f(__out) << "\\n";`;

  return [
    "",
    "int main() {",
    "  ios_base::sync_with_stdio(false);",
    "  cin.tie(nullptr);",
    "  Solution sol;",
    ...decls,
    printLine,
    "  __t::emit();",
    "  return 0;",
    "}",
  ].join("\n");
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Returns an instrumented C++ source file ready to be sent to Piston.
 * Includes the trace library, the instrumented user code, and (if needed)
 * an auto-generated `main()` with stdin argument parsing.
 */
export function buildCppTracerCode(userCode: string, stdin: string): string {
  const hasMain     = /\bint\s+main\s*\(/.test(userCode);
  const isLeetCode  = /\bclass\s+Solution\b/.test(userCode) && !hasMain;

  const instrumented = instrumentCode(userCode);
  const driver       = isLeetCode ? buildCppDriver(userCode, stdin) : "";

  let finalCode = CPP_TRACE_LIB + "\n\n" + instrumented;

  if (isLeetCode && driver) {
    finalCode += "\n" + driver;
  } else if (hasMain) {
    // Insert __t::emit() just before the final `return 0` inside main
    finalCode = finalCode.replace(
      /(\breturn\s+0\s*;)(\s*\n?\s*\}[\s\n]*$)/,
      "  __t::emit();\n  $1$2",
    );
    if (!finalCode.includes("__t::emit()")) {
      // Fallback: append at the very end
      finalCode += "\n// trace emit\nstruct __EmitOnExit { ~__EmitOnExit(){ __t::emit(); } } __emitter;";
    }
  } else {
    // Standalone functions — wrap in a minimal main
    finalCode += [
      "\nint main() {",
      "  // no entry point detected – no driver generated",
      "  __t::emit();",
      "  return 0;",
      "}",
    ].join("\n");
  }

  return finalCode;
}
