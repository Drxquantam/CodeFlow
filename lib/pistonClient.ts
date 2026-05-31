/** Thin wrapper around the public Piston code-execution API (emkc.org/api/v2/piston). */

type PistonRunResult = {
  run: {
    stdout: string;
    stderr: string;
    /** Process exit code – 0 means success */
    code: number;
  };
  compile?: {
    stderr: string;
    code: number;
  };
};

const PISTON_URL = "https://emkc.org/api/v2/piston/execute";

/** Map from CodeFlow language label → Piston runtime spec */
const LANG_SPEC: Record<string, { language: string; version: string; ext: string }> = {
  Python:     { language: "python",     version: "3.10.0",  ext: "py"   },
  JavaScript: { language: "javascript", version: "18.15.0", ext: "js"   },
  Java:       { language: "java",       version: "15.0.2",  ext: "java" },
  "C++":      { language: "cpp",        version: "10.2.0",  ext: "cpp"  },
};

export type PistonOutput = {
  stdout: string;
  stderr: string;
  exitCode: number;
  compileFailed: boolean;
};

/**
 * Executes `code` via Piston and returns stdout + stderr.
 * Throws on network failure or unsupported language.
 * Never throws on non-zero exit codes — callers inspect `.exitCode`.
 */
export async function runWithPiston(
  language: string,
  code: string,
  stdin = "",
): Promise<PistonOutput> {
  const spec = LANG_SPEC[language];
  if (!spec) {
    throw new Error(`Piston: language "${language}" is not supported for execution.`);
  }

  const response = await fetch(PISTON_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language: spec.language,
      version: spec.version,
      files: [{ name: `main.${spec.ext}`, content: code }],
      stdin,
      run_timeout: 8_000,
      compile_timeout: 10_000,
    }),
    signal: AbortSignal.timeout(14_000),
  });

  if (!response.ok) {
    throw new Error(`Piston returned HTTP ${response.status}.`);
  }

  const data = (await response.json()) as PistonRunResult;

  return {
    stdout:        data.run.stdout  ?? "",
    stderr:        data.run.stderr  ?? "",
    exitCode:      data.run.code    ?? 0,
    compileFailed: (data.compile?.code ?? 0) !== 0,
  };
}
