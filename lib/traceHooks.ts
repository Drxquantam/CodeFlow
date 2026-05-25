export function generateTraceHookSuggestion(language: string, algorithm?: string) {
  const normalized = language.toLowerCase();

  if (normalized.includes("java")) {
    return {
      language: "java",
      algorithm,
      message: "Automatic arbitrary Java tracing is not enabled. Add trace prints, run your code, then paste the trace output.",
      helper: `static void traceArray(int step, String operation, int[] arr, int activeIndex) {
    StringBuilder out = new StringBuilder();
    out.append("{\\"step\\":").append(step)
       .append(",\\"operation\\":\\"").append(operation).append("\\"")
       .append(",\\"array\\":[");
    for (int i = 0; i < arr.length; i++) {
        if (i > 0) out.append(",");
        out.append(arr[i]);
    }
    out.append("],\\"activeIndex\\":").append(activeIndex).append("}");
    System.out.println(out.toString());
}`,
    };
  }

  return {
    language: "cpp",
    algorithm,
    message: "Automatic arbitrary C++ tracing is not enabled. Add trace prints, run your code, then paste the trace output.",
    helper: `#define TRACE_JSON(step, operation, state) \\
    cout << "{\\"step\\":" << step << ",\\"operation\\":\\"" << operation << "\\",\\"state\\":\\"" << state << "\\"}" << endl;

void traceArray(int step, string operation, vector<int>& arr, int activeIndex = -1) {
    cout << "{\\"step\\":" << step << ",\\"operation\\":\\"" << operation << "\\",\\"array\\":[";
    for (int i = 0; i < arr.size(); i++) {
        if (i) cout << ",";
        cout << arr[i];
    }
    cout << "],\\"activeIndex\\":" << activeIndex << "}" << endl;
}`,
  };
}
