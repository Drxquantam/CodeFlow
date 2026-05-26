import type { CodeFlowAnalysisResult } from "@/types/codeflowAnalysis";

type DryRunPattern =
  | "binary_search"
  | "sorting"
  | "bfs"
  | "dfs_recursion"
  | "dp"
  | "sliding_window"
  | "two_pointers"
  | "stack"
  | "heap"
  | "graph_shortest_path"
  | "linked_list"
  | "tree"
  | "generic";

type Schema = {
  pattern: DryRunPattern;
  label: string;
  columns: string[];
};

export const dryRunSchemas: Record<DryRunPattern, Schema> = {
  binary_search: {
    pattern: "binary_search",
    label: "Binary Search",
    columns: ["Step", "Low", "Mid", "High", "Value Checked", "Condition", "Action", "Explanation"],
  },
  sorting: {
    pattern: "sorting",
    label: "Sorting / Divide and Conquer",
    columns: ["Step", "Operation", "Indices", "Comparison", "Change Made", "Array State", "Explanation"],
  },
  bfs: {
    pattern: "bfs",
    label: "Breadth-First Search",
    columns: ["Step", "Current State", "Next/Neighbor", "Queue Before", "Queue After", "Visited", "Condition", "Action", "Explanation"],
  },
  dfs_recursion: {
    pattern: "dfs_recursion",
    label: "DFS / Recursion",
    columns: ["Step", "Function Call", "Current State", "Choice/Neighbor", "Condition", "Recursion Stack", "Visited/Used", "Action", "Explanation"],
  },
  dp: {
    pattern: "dp",
    label: "Dynamic Programming",
    columns: ["Step", "State", "Formula", "Previous Values", "Updated Value", "DP State", "Action", "Explanation"],
  },
  sliding_window: {
    pattern: "sliding_window",
    label: "Sliding Window",
    columns: ["Step", "Left", "Right", "Window", "Current Value", "Condition", "Window Update", "Answer Update", "Explanation"],
  },
  two_pointers: {
    pattern: "two_pointers",
    label: "Two Pointers",
    columns: ["Step", "Left Pointer", "Right Pointer", "Values", "Condition", "Pointer Move", "Answer Update", "Explanation"],
  },
  stack: {
    pattern: "stack",
    label: "Stack / Monotonic Stack",
    columns: ["Step", "Current Element", "Stack Before", "Condition", "Operation", "Popped Elements", "Stack After", "Answer Update", "Explanation"],
  },
  heap: {
    pattern: "heap",
    label: "Heap / Priority Queue",
    columns: ["Step", "Current Item", "Heap Before", "Operation", "Heap After", "State Update", "Explanation"],
  },
  graph_shortest_path: {
    pattern: "graph_shortest_path",
    label: "Graph Shortest Path",
    columns: ["Step", "Current Node", "Edge/Neighbor", "Old Distance", "New Distance", "Queue/Heap", "Action", "Explanation"],
  },
  linked_list: {
    pattern: "linked_list",
    label: "Linked List",
    columns: ["Step", "Current", "Previous", "Next", "Pointer Change", "List State", "Explanation"],
  },
  tree: {
    pattern: "tree",
    label: "Tree Traversal",
    columns: ["Step", "Current Node", "Direction/Operation", "Stack/Queue/Recursion", "Result State", "Explanation"],
  },
  generic: {
    pattern: "generic",
    label: "Generic Code Walkthrough",
    columns: ["Step", "Code/Operation", "Condition Checked", "Result", "Variable Changes", "Data Structure State", "Explanation"],
  },
};

export function enrichDryRunForAlgorithm(
  result: CodeFlowAnalysisResult,
  stdin: string,
  code = "",
): CodeFlowAnalysisResult {
  const pattern = detectDryRunPattern(result.detectedAlgorithm, code);
  const schema = dryRunSchemas[pattern];
  const input = stdin.trim();
  const missingInputWarning = "Input is required for a reliable dry run. Please provide input and generate again.";
  const uncertaintyWarning = "AI-generated logical dry run. Verify exact runtime behavior with a compiler.";
  const currentWarnings = result.dryRun?.warnings ?? [];

  if (!input) {
    return {
      ...result,
      detectedPattern: schema.pattern,
      inputUsed: "",
      dryRun: {
        input: "",
        columns: schema.columns,
        rows: [],
        variableWatch: [],
        snapshots: [],
        finalOutput: "",
        warnings: uniqueStrings([missingInputWarning, ...currentWarnings]),
      },
      hiddenTestRisks: buildHiddenRiskList(result),
    };
  }

  const normalizedRows = (result.dryRun?.rows ?? []).map((row, index) =>
    normalizeRow(row, schema.columns, index + 1),
  );

  return {
    ...result,
    detectedPattern: schema.pattern,
    inputUsed: result.dryRun?.input || input,
    dryRun: {
      input: result.dryRun?.input || input,
      columns: schema.columns,
      rows: normalizedRows,
      variableWatch: result.dryRun?.variableWatch ?? buildVariableWatch(normalizedRows, schema),
      snapshots: result.dryRun?.snapshots ?? buildSnapshots(normalizedRows, schema),
      finalOutput: result.dryRun?.finalOutput ?? "",
      warnings: uniqueStrings([uncertaintyWarning, ...currentWarnings]),
    },
    hiddenTestRisks: buildHiddenRiskList(result),
  };
}

export function detectDryRunPattern(algorithm = "", code = ""): DryRunPattern {
  const source = `${algorithm}\n${code}`.toLowerCase();

  if (/\b(low|lo|l)\b/.test(source) && /\b(high|hi|r)\b/.test(source) && /\bmid\b/.test(source)) return "binary_search";
  if (source.includes("priority_queue") || source.includes("heapq") || source.includes("poll(") || source.includes(".offer(")) {
    if (source.includes("dist") || source.includes("distance") || source.includes("relax")) return "graph_shortest_path";
    return "heap";
  }
  if (source.includes("dijkstra") || source.includes("bellman") || (source.includes("dist") && source.includes("edge"))) return "graph_shortest_path";
  if (source.includes("queue") && (source.includes("visited") || source.includes("level") || source.includes("distance"))) return "bfs";
  if ((source.includes("dfs") || source.includes("recursion")) && (source.includes("visited") || source.includes("adj") || source.includes("root"))) return "dfs_recursion";
  if (source.includes("indegree") || source.includes("topo")) return "bfs";
  if (source.includes("dp") || source.includes("memo") || source.includes("recurrence")) return "dp";
  if (source.includes("mergesort") || source.includes("merge sort") || source.includes("partition") || source.includes("pivot") || source.includes("swap(") || source.includes("sort(")) return "sorting";
  if (source.includes("left") && source.includes("right") && (source.includes("window") || source.includes("freq") || source.includes("map"))) return "sliding_window";
  if (source.includes("slow") && source.includes("fast")) return "linked_list";
  if (source.includes("head") && source.includes("next")) return "linked_list";
  if (source.includes("left") && source.includes("right") && !source.includes("root")) return "two_pointers";
  if (source.includes("stack") || source.includes(".top()") || source.includes(".peek()")) return "stack";
  if (source.includes("root") && (source.includes("left") || source.includes("right"))) return "tree";
  if (source.includes("dfs") || source.includes("recursive") || source.includes("return ") && source.includes("(")) return "dfs_recursion";

  return "generic";
}

function normalizeRow(row: Record<string, string>, columns: string[], step: number) {
  const entries = columns.map((column) => {
    if (column === "Step") return [column, stringifyCell(row[column] ?? row.step ?? step)];
    return [column, stringifyCell(row[column] ?? findLooseValue(row, column) ?? "-")];
  });

  return Object.fromEntries(entries);
}

function findLooseValue(row: Record<string, string>, column: string) {
  const wanted = normalizeKey(column);
  const match = Object.entries(row).find(([key]) => normalizeKey(key) === wanted);
  if (match) return match[1];

  const aliases: Record<string, string[]> = {
    valuechecked: ["numsmid", "arrmid", "value", "checkedvalue"],
    currentstate: ["currentnode", "current", "state"],
    nextneighbor: ["neighbor", "next", "neighborchecked"],
    queuebefore: ["queue"],
    queueafter: ["queue"],
    visitedused: ["visited", "used"],
    datastructurestate: ["state", "arraystate", "dpstate", "liststate"],
    variablechanges: ["variables", "changedvariables"],
    answerupdate: ["answer", "ans", "outputans"],
  };

  const aliasMatch = aliases[wanted]?.find((alias) =>
    Object.keys(row).some((key) => normalizeKey(key) === alias),
  );
  if (!aliasMatch) return undefined;

  const originalKey = Object.keys(row).find((key) => normalizeKey(key) === aliasMatch);
  return originalKey ? row[originalKey] : undefined;
}

function buildVariableWatch(rows: Array<Record<string, string>>, schema: Schema) {
  return rows.slice(0, 8).map((row, index) => ({
    step: Number(row.Step) || index + 1,
    variables: Object.fromEntries(
      schema.columns
        .filter((column) => column !== "Step" && !["Explanation", "Action"].includes(column))
        .slice(0, 4)
        .map((column) => [column, row[column] ?? "-"]),
    ),
  }));
}

function buildSnapshots(rows: Array<Record<string, string>>, schema: Schema) {
  return rows.slice(0, 6).map((row, index) => ({
    step: Number(row.Step) || index + 1,
    title: row.Action || row.Operation || row["Code/Operation"] || `${schema.label} step ${index + 1}`,
    description: row.Explanation || "This step updates the tracked state for the selected algorithm pattern.",
    variables: Object.fromEntries(
      schema.columns
        .filter((column) => column !== "Step" && !["Explanation", "Action", "Operation"].includes(column))
        .slice(0, 3)
        .map((column) => [column, row[column] ?? "-"]),
    ),
  }));
}

function buildHiddenRiskList(result: CodeFlowAnalysisResult) {
  return uniqueStrings([
    ...(result.hiddenTestRisks ?? []),
    ...(result.review?.edgeCaseRisks ?? []),
    ...(result.dryRun?.warnings ?? []).filter((warning) => /risk|edge|overflow|invalid|missing|unreachable/i.test(warning)),
  ]).slice(0, 8);
}

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function stringifyCell(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
