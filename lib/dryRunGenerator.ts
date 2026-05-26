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
  const uncertaintyWarning = "Approximate AI-generated dry run. Verify exact behavior with compiler.";
  const currentWarnings = result.dryRun?.warnings ?? [];

  if (!input) {
    return {
      ...result,
      detectedPattern: schema.pattern,
      inputUsed: "",
      dryRun: {
        input: "",
        confidence: "Input missing",
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

  const exact = generateDeterministicDryRun(result, code, input);
  if (exact) {
    return {
      ...result,
      detectedPattern: exact.pattern,
      inputUsed: input,
      dryRun: exact.dryRun,
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
      confidence: "AI-assisted approximate dry run",
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

function generateDeterministicDryRun(result: CodeFlowAnalysisResult, code: string, input: string): { pattern: DryRunPattern; dryRun: NonNullable<CodeFlowAnalysisResult["dryRun"]> } | null {
  const source = `${result.detectedAlgorithm ?? ""}\n${code}`.toLowerCase();

  if (source.includes("bellman")) {
    const graph = parseWeightedGraphInput(input);
    if (!graph) return unsupportedInput("graph_shortest_path", input, ["For Bellman-Ford, provide: V = 6, edges = [[u,v,w], ...], source = 0"]);
    return { pattern: "graph_shortest_path", dryRun: generateBellmanFordDryRun(graph, input) };
  }

  if (source.includes("dijkstra") || source.includes("priority_queue") || source.includes("heapq")) {
    const graph = parseWeightedGraphInput(input);
    if (!graph) return unsupportedInput("graph_shortest_path", input, ["For Dijkstra, provide: V = 5, edges = [[u,v,w], ...], source = 0"]);
    return { pattern: "graph_shortest_path", dryRun: generateDijkstraDryRun(graph, input) };
  }

  if (detectDryRunPattern(result.detectedAlgorithm, code) === "binary_search") {
    const binary = parseNumsAndTarget(input);
    if (!binary) return unsupportedInput("binary_search", input, ["For binary search, provide: nums = [1,2,3], target = 2"]);
    return { pattern: "binary_search", dryRun: generateBinarySearchDryRun(binary.nums, binary.target, input) };
  }

  if (detectDryRunPattern(result.detectedAlgorithm, code) === "sorting") {
    const nums = parseNumberArray(input);
    if (!nums.length) return unsupportedInput("sorting", input, ["For sorting, provide: nums = [5,2,3,1]"]);
    const isQuick = source.includes("quick") || source.includes("partition") || source.includes("pivot");
    return { pattern: "sorting", dryRun: isQuick ? generateQuickSortDryRun(nums, input) : generateMergeSortDryRun(nums, input) };
  }

  if (detectDryRunPattern(result.detectedAlgorithm, code) === "bfs") {
    if (source.includes("indegree") || source.includes("topo")) {
      const graph = parseUnweightedGraphInput(input);
      if (!graph) return unsupportedInput("bfs", input, ["For topological sort, provide: nodes = [0,1,2], edges = [[0,1],[1,2]], directed = true"]);
      return { pattern: "bfs", dryRun: generateTopologicalSortDryRun({ ...graph, directed: true }, input) };
    }
    const graph = parseUnweightedGraphInput(input);
    if (!graph) return unsupportedInput("bfs", input, ["For BFS, provide: nodes = [1,2,3], edges = [[1,2],[2,3]], source = 1"]);
    return { pattern: "bfs", dryRun: generateBFSDryRun(graph, input) };
  }

  if (detectDryRunPattern(result.detectedAlgorithm, code) === "dfs_recursion" && source.includes("dfs")) {
    const graph = parseUnweightedGraphInput(input);
    if (!graph) return unsupportedInput("dfs_recursion", input, ["For DFS, provide: nodes = [1,2,3], edges = [[1,2],[2,3]], source = 1"]);
    return { pattern: "dfs_recursion", dryRun: generateDFSDryRun(graph, input) };
  }

  const pattern = detectDryRunPattern(result.detectedAlgorithm, code);
  if (pattern === "sliding_window") {
    const nums = parseNumberArray(input);
    const k = parseNamedNumber(input, "k");
    const text = parseNamedString(input, "s");
    if (nums.length && k != null) return { pattern, dryRun: generateFixedWindowDryRun(nums, k, input) };
    if (text) return { pattern, dryRun: generateLongestUniqueSubstringDryRun(text, input) };
    return unsupportedInput(pattern, input, ["For sliding window, provide: nums = [2,1,5,1,3,2], k = 3 or s = \"abcabcbb\""]);
  }

  if (pattern === "two_pointers") {
    const pair = parseNumsAndTarget(input);
    if (!pair) return unsupportedInput(pattern, input, ["For two pointers, provide sorted nums and target: nums = [1,2,3,4,6], target = 6"]);
    return { pattern, dryRun: generateTwoPointersDryRun(pair.nums, pair.target, input) };
  }

  if (pattern === "stack") {
    const text = parseNamedString(input, "s");
    const nums = parseNumberArray(input);
    if (text) return { pattern, dryRun: generateValidParenthesesDryRun(text, input) };
    if (nums.length) return { pattern, dryRun: generateNextGreaterDryRun(nums, input) };
    return unsupportedInput(pattern, input, ["For stack, provide: s = \"({[]})\" or nums = [2,1,2,4,3]"]);
  }

  if (pattern === "dp") {
    const n = parseNamedNumber(input, "n");
    if (n != null) return { pattern, dryRun: generateBasicDPDryRun(n, input) };
    const nums = parseNumberArray(input);
    if (nums.length) return { pattern, dryRun: generateHouseRobberDPDryRun(nums, input) };
    return unsupportedInput(pattern, input, ["For basic DP, provide: n = 5 or nums = [2,7,9,3,1]"]);
  }

  return null;
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

type WeightedGraphInput = {
  vertices: number;
  edges: Array<[number, number, number]>;
  source: number;
};

type GraphInput = {
  nodes: Array<string | number>;
  edges: Array<[string | number, string | number]>;
  source: string | number;
  directed: boolean;
};

function unsupportedInput(pattern: DryRunPattern, input: string, warnings: string[]) {
  return {
    pattern,
    dryRun: {
      input,
      confidence: "Unsupported pattern" as const,
      columns: dryRunSchemas[pattern].columns,
      rows: [],
      variableWatch: [],
      snapshots: [],
      finalOutput: "",
      warnings,
    },
  };
}

function generateBellmanFordDryRun(graph: WeightedGraphInput, input: string): NonNullable<CodeFlowAnalysisResult["dryRun"]> {
  const columns = ["Pass", "Step", "Edge", "Weight", "dist[u]", "Old dist[v]", "Candidate", "Condition", "Updated?", "Distance Array", "Explanation"];
  const inf = Number.POSITIVE_INFINITY;
  const dist = Array.from({ length: graph.vertices }, () => inf);
  dist[graph.source] = 0;
  const rows: Array<Record<string, string>> = [];
  const watch: NonNullable<CodeFlowAnalysisResult["dryRun"]>["variableWatch"] = [];
  let step = 1;

  for (let pass = 1; pass <= Math.max(graph.vertices - 1, 0); pass += 1) {
    let changed = false;
    for (const [u, v, weight] of graph.edges) {
      const du = dist[u] ?? inf;
      const old = dist[v] ?? inf;
      const candidate = Number.isFinite(du) ? du + weight : inf;
      const shouldUpdate = Number.isFinite(du) && candidate < old;
      if (shouldUpdate) {
        dist[v] = candidate;
        changed = true;
      }
      const row = {
        Pass: String(pass),
        Step: String(step),
        Edge: `${u} -> ${v}`,
        Weight: String(weight),
        "dist[u]": formatDistance(du),
        "Old dist[v]": formatDistance(old),
        Candidate: formatDistance(candidate),
        Condition: `dist[${u}] != INF and ${formatDistance(candidate)} < ${formatDistance(old)} = ${shouldUpdate ? "true" : "false"}`,
        "Updated?": shouldUpdate ? `Yes, dist[${v}] = ${candidate}` : "No",
        "Distance Array": formatDistances(dist),
        Explanation: shouldUpdate
          ? `The path to ${u} is known, and going through edge ${u}->${v} improves vertex ${v}, so dist[${v}] is updated.`
          : Number.isFinite(du)
            ? `The candidate distance does not improve dist[${v}], so this edge causes no relaxation.`
            : `dist[${u}] is still INF, so this edge cannot be used yet.`,
      };
      rows.push(row);
      watch.push({ step, variables: { pass: String(pass), edge: row.Edge, candidate: row.Candidate, distances: row["Distance Array"] } });
      step += 1;
    }
    if (!changed) break;
  }

  return {
    input,
    confidence: "Exact deterministic dry run",
    columns,
    rows,
    variableWatch: watch,
    snapshots: rows.slice(0, 8).map((row) => ({
      step: Number(row.Step),
      title: `${row["Updated?"].startsWith("Yes") ? "Relaxed" : "Checked"} ${row.Edge}`,
      description: row.Explanation,
      variables: { distances: row["Distance Array"], condition: row.Condition },
    })),
    finalOutput: formatDistances(dist),
    warnings: ["Exact deterministic Bellman-Ford dry run generated from the provided edges and source."],
  };
}

function generateDijkstraDryRun(graph: WeightedGraphInput, input: string): NonNullable<CodeFlowAnalysisResult["dryRun"]> {
  const columns = dryRunSchemas.graph_shortest_path.columns;
  const adj = buildWeightedAdj(graph);
  const dist = Array.from({ length: graph.vertices }, () => Number.POSITIVE_INFINITY);
  const visited = new Set<number>();
  const heap: Array<[number, number]> = [[0, graph.source]];
  const rows: Array<Record<string, string>> = [];
  dist[graph.source] = 0;
  let step = 1;

  while (heap.length) {
    heap.sort((a, b) => a[0] - b[0]);
    const [currentDistance, node] = heap.shift()!;
    if (visited.has(node)) continue;
    visited.add(node);

    for (const [next, weight] of adj.get(node) ?? []) {
      const old = dist[next] ?? Number.POSITIVE_INFINITY;
      const candidate = currentDistance + weight;
      const updated = candidate < old;
      if (updated) {
        dist[next] = candidate;
        heap.push([candidate, next]);
      }
      rows.push(normalizeRow({
        Step: String(step++),
        "Current Node": String(node),
        "Edge/Neighbor": `${node} -> ${next} (w=${weight})`,
        "Old Distance": formatDistance(old),
        "New Distance": formatDistance(candidate),
        "Queue/Heap": formatHeap(heap),
        Action: updated ? `Relax edge and set dist[${next}] = ${candidate}` : "No relaxation",
        Explanation: updated
          ? "The candidate path is smaller, so Dijkstra updates the neighbor and pushes it into the min-heap."
          : "The current best distance is already smaller, so this edge does not change the state.",
      }, columns, step));
    }
  }

  return exactDryRun("graph_shortest_path", input, rows, formatDistances(dist));
}

function generateBinarySearchDryRun(nums: number[], target: number, input: string): NonNullable<CodeFlowAnalysisResult["dryRun"]> {
  const columns = dryRunSchemas.binary_search.columns;
  const rows: Array<Record<string, string>> = [];
  let low = 0;
  let high = nums.length - 1;
  let found = -1;
  let step = 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const value = nums[mid];
    const condition = `${value} === ${target}`;
    let action = "Target found";
    let explanation = "The middle value equals the target, so the search stops.";
    if (value === target) found = mid;
    else if (value < target) {
      action = `Move low to ${mid + 1}`;
      explanation = "The middle value is smaller than target, so the left half is discarded.";
      low = mid + 1;
    } else {
      action = `Move high to ${mid - 1}`;
      explanation = "The middle value is larger than target, so the right half is discarded.";
      high = mid - 1;
    }
    rows.push(normalizeRow({ Step: String(step), Low: String(low), Mid: String(mid), High: String(high), "Value Checked": String(value), Condition: condition, Action: action, Explanation: explanation }, columns, step));
    step += 1;
    if (found !== -1) break;
  }

  return exactDryRun("binary_search", input, rows, found === -1 ? "-1" : String(found));
}

function generateMergeSortDryRun(nums: number[], input: string): NonNullable<CodeFlowAnalysisResult["dryRun"]> {
  const columns = dryRunSchemas.sorting.columns;
  const arr = [...nums];
  const rows: Array<Record<string, string>> = [];
  let step = 1;
  const push = (row: Record<string, string>) => rows.push(normalizeRow({ Step: String(step++), ...row }, columns, step));
  const sort = (l: number, r: number) => {
    push({ Operation: `mergeSort(${l}, ${r})`, Indices: `[${l}..${r}]`, Comparison: l >= r ? "base case" : "-", "Change Made": l >= r ? "return" : "split range", "Array State": formatArray(arr), Explanation: l >= r ? "A single element is already sorted." : "Split the range before merging sorted halves." });
    if (l >= r) return;
    const m = Math.floor((l + r) / 2);
    sort(l, m);
    sort(m + 1, r);
    const left = arr.slice(l, m + 1);
    const right = arr.slice(m + 1, r + 1);
    let i = 0, j = 0, k = l;
    while (i < left.length && j < right.length) {
      const takeLeft = left[i] <= right[j];
      arr[k++] = takeLeft ? left[i++] : right[j++];
      push({ Operation: `merge(${l}, ${m}, ${r})`, Indices: `write ${k - 1}`, Comparison: `${left[i - (takeLeft ? 1 : 0)] ?? "-"} vs ${right[j - (takeLeft ? 0 : 1)] ?? "-"}`, "Change Made": `write ${arr[k - 1]}`, "Array State": formatArray(arr), Explanation: "Take the smaller front value and write it back into the original range." });
    }
    while (i < left.length) { arr[k++] = left[i++]; push({ Operation: `merge(${l}, ${m}, ${r})`, Indices: `write ${k - 1}`, Comparison: "-", "Change Made": `copy ${arr[k - 1]}`, "Array State": formatArray(arr), Explanation: "Copy the remaining left-half value." }); }
    while (j < right.length) { arr[k++] = right[j++]; push({ Operation: `merge(${l}, ${m}, ${r})`, Indices: `write ${k - 1}`, Comparison: "-", "Change Made": `copy ${arr[k - 1]}`, "Array State": formatArray(arr), Explanation: "Copy the remaining right-half value." }); }
  };
  sort(0, arr.length - 1);
  return exactDryRun("sorting", input, rows, formatArray(arr));
}

function generateQuickSortDryRun(nums: number[], input: string): NonNullable<CodeFlowAnalysisResult["dryRun"]> {
  const columns = dryRunSchemas.sorting.columns;
  const arr = [...nums];
  const rows: Array<Record<string, string>> = [];
  let step = 1;
  const push = (row: Record<string, string>) => rows.push(normalizeRow({ Step: String(step++), ...row }, columns, step));
  const partition = (low: number, high: number) => {
    const pivot = arr[high];
    let i = low - 1;
    for (let j = low; j < high; j += 1) {
      const take = arr[j] <= pivot;
      if (take) { i += 1; [arr[i], arr[j]] = [arr[j], arr[i]]; }
      push({ Operation: `partition(${low}, ${high})`, Indices: `i=${i}, j=${j}`, Comparison: `${arr[j]} <= pivot ${pivot} = ${take}`, "Change Made": take ? `swap indices ${i} and ${j}` : "no swap", "Array State": formatArray(arr), Explanation: take ? "Value belongs on the left side of the pivot." : "Value stays on the right side of the pivot." });
    }
    [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
    push({ Operation: `partition(${low}, ${high})`, Indices: `pivot index ${i + 1}`, Comparison: "-", "Change Made": "place pivot", "Array State": formatArray(arr), Explanation: "Move pivot into its final sorted position." });
    return i + 1;
  };
  const quick = (low: number, high: number) => {
    if (low >= high) return;
    const p = partition(low, high);
    quick(low, p - 1);
    quick(p + 1, high);
  };
  quick(0, arr.length - 1);
  return exactDryRun("sorting", input, rows, formatArray(arr));
}

function generateBFSDryRun(graph: GraphInput, input: string): NonNullable<CodeFlowAnalysisResult["dryRun"]> {
  const columns = dryRunSchemas.bfs.columns;
  const adj = buildAdj(graph);
  const queue = [graph.source];
  const visited = new Set([String(graph.source)]);
  const rows: Array<Record<string, string>> = [];
  let step = 1;
  while (queue.length) {
    const current = queue.shift()!;
    for (const next of adj.get(String(current)) ?? []) {
      const before = formatArrayLike(queue);
      const seen = visited.has(String(next));
      if (!seen) { visited.add(String(next)); queue.push(next); }
      rows.push(normalizeRow({ Step: String(step++), "Current State": String(current), "Next/Neighbor": String(next), "Queue Before": before, "Queue After": formatArrayLike(queue), Visited: formatArrayLike([...visited]), Condition: `visited[${next}] is ${seen ? "true" : "false"}`, Action: seen ? "Skip already visited neighbor" : "Mark visited and enqueue neighbor", Explanation: seen ? "BFS does not enqueue a node twice." : "Unvisited neighbors are added to the queue for later processing." }, columns, step));
    }
  }
  return exactDryRun("bfs", input, rows, formatArrayLike([...visited]));
}

function generateDFSDryRun(graph: GraphInput, input: string): NonNullable<CodeFlowAnalysisResult["dryRun"]> {
  const columns = dryRunSchemas.dfs_recursion.columns;
  const adj = buildAdj(graph);
  const visited = new Set<string>();
  const stack: string[] = [];
  const rows: Array<Record<string, string>> = [];
  let step = 1;
  const dfs = (node: string | number) => {
    visited.add(String(node));
    stack.push(String(node));
    rows.push(normalizeRow({ Step: String(step++), "Function Call": `dfs(${node})`, "Current State": String(node), "Choice/Neighbor": "-", Condition: "enter node", "Recursion Stack": formatArrayLike(stack), "Visited/Used": formatArrayLike([...visited]), Action: "Mark current node visited", Explanation: "DFS marks the node before exploring its neighbors." }, columns, step));
    for (const next of adj.get(String(node)) ?? []) {
      const seen = visited.has(String(next));
      rows.push(normalizeRow({ Step: String(step++), "Function Call": `dfs(${node})`, "Current State": String(node), "Choice/Neighbor": String(next), Condition: `visited[${next}] is ${seen ? "true" : "false"}`, "Recursion Stack": formatArrayLike(stack), "Visited/Used": formatArrayLike([...visited]), Action: seen ? "Skip neighbor" : `Recurse into ${next}`, Explanation: seen ? "Already visited nodes are ignored to avoid cycles." : "An unvisited neighbor becomes the next recursive call." }, columns, step));
      if (!seen) dfs(next);
    }
    stack.pop();
  };
  dfs(graph.source);
  return exactDryRun("dfs_recursion", input, rows, formatArrayLike([...visited]));
}

function generateTopologicalSortDryRun(graph: GraphInput, input: string): NonNullable<CodeFlowAnalysisResult["dryRun"]> {
  const columns = dryRunSchemas.bfs.columns;
  const nodes = graph.nodes.map(String);
  const adj = new Map(nodes.map((node) => [node, [] as string[]]));
  const indegree = new Map(nodes.map((node) => [node, 0]));
  graph.edges.forEach(([from, to]) => {
    const u = String(from);
    const v = String(to);
    adj.set(u, [...(adj.get(u) ?? []), v]);
    indegree.set(v, (indegree.get(v) ?? 0) + 1);
    if (!indegree.has(u)) indegree.set(u, 0);
  });
  const queue = [...indegree.entries()].filter(([, value]) => value === 0).map(([node]) => node);
  const result: string[] = [];
  const rows: Array<Record<string, string>> = [];
  let step = 1;

  while (queue.length) {
    const current = queue.shift()!;
    result.push(current);
    for (const next of adj.get(current) ?? []) {
      const before = formatArrayLike(queue);
      const updated = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, updated);
      if (updated === 0) queue.push(next);
      rows.push(normalizeRow({
        Step: String(step++),
        "Current State": current,
        "Next/Neighbor": next,
        "Queue Before": before,
        "Queue After": formatArrayLike(queue),
        Visited: formatArrayLike(result),
        Condition: `indegree[${next}] becomes ${updated}`,
        Action: updated === 0 ? "Push neighbor into queue" : "Wait for remaining prerequisites",
        Explanation: "Topological sort removes the current node and reduces indegree of outgoing neighbors.",
      }, columns, step));
    }
  }

  return exactDryRun("bfs", input, rows, formatArrayLike(result));
}

function generateFixedWindowDryRun(nums: number[], k: number, input: string): NonNullable<CodeFlowAnalysisResult["dryRun"]> {
  const columns = dryRunSchemas.sliding_window.columns;
  const rows: Array<Record<string, string>> = [];
  let sum = 0;
  let best = Number.NEGATIVE_INFINITY;
  for (let right = 0; right < nums.length; right += 1) {
    sum += nums[right];
    const left = right - k + 1;
    if (right >= k) sum -= nums[right - k];
    const valid = right >= k - 1;
    if (valid) best = Math.max(best, sum);
    rows.push(normalizeRow({
      Step: String(right + 1),
      Left: valid ? String(left) : "-",
      Right: String(right),
      Window: formatArray(nums.slice(Math.max(0, left), right + 1)),
      "Current Value": String(nums[right]),
      Condition: `window size ${Math.min(right + 1, k)} ${valid ? "==" : "<"} k`,
      "Window Update": `sum = ${sum}`,
      "Answer Update": valid ? `best = ${best}` : "not enough elements yet",
      Explanation: valid ? "The fixed-size window is complete, so update the best answer." : "Keep expanding until the window reaches size k.",
    }, columns, right + 1));
  }
  return exactDryRun("sliding_window", input, rows, String(best));
}

function generateLongestUniqueSubstringDryRun(text: string, input: string): NonNullable<CodeFlowAnalysisResult["dryRun"]> {
  const columns = dryRunSchemas.sliding_window.columns;
  const rows: Array<Record<string, string>> = [];
  const lastSeen = new Map<string, number>();
  let left = 0;
  let best = 0;
  for (let right = 0; right < text.length; right += 1) {
    const char = text[right];
    const duplicate = lastSeen.has(char) && (lastSeen.get(char) ?? -1) >= left;
    if (duplicate) left = (lastSeen.get(char) ?? -1) + 1;
    lastSeen.set(char, right);
    best = Math.max(best, right - left + 1);
    rows.push(normalizeRow({
      Step: String(right + 1),
      Left: String(left),
      Right: String(right),
      Window: text.slice(left, right + 1),
      "Current Value": char,
      Condition: duplicate ? `${char} already inside window` : `${char} is new for current window`,
      "Window Update": duplicate ? `left moves to ${left}` : "expand right",
      "Answer Update": `best = ${best}`,
      Explanation: duplicate ? "Move left after the previous same character to restore uniqueness." : "No duplicate conflict, so the current window remains valid.",
    }, columns, right + 1));
  }
  return exactDryRun("sliding_window", input, rows, String(best));
}

function generateTwoPointersDryRun(nums: number[], target: number, input: string): NonNullable<CodeFlowAnalysisResult["dryRun"]> {
  const columns = dryRunSchemas.two_pointers.columns;
  const rows: Array<Record<string, string>> = [];
  let left = 0;
  let right = nums.length - 1;
  let answer = "-1";
  let step = 1;

  while (left < right) {
    const sum = nums[left] + nums[right];
    const action = sum === target ? "Target pair found" : sum < target ? "Move left pointer right" : "Move right pointer left";
    rows.push(normalizeRow({
      Step: String(step++),
      "Left Pointer": `${left} (${nums[left]})`,
      "Right Pointer": `${right} (${nums[right]})`,
      Values: `${nums[left]} + ${nums[right]} = ${sum}`,
      Condition: `${sum} ${sum === target ? "==" : sum < target ? "<" : ">"} ${target}`,
      "Pointer Move": action,
      "Answer Update": sum === target ? `[${left}, ${right}]` : answer,
      Explanation: sum === target ? "The pair matches the target." : sum < target ? "The sum is too small, so increase it by moving left." : "The sum is too large, so decrease it by moving right.",
    }, columns, step));
    if (sum === target) { answer = `[${left}, ${right}]`; break; }
    if (sum < target) left += 1;
    else right -= 1;
  }

  return exactDryRun("two_pointers", input, rows, answer);
}

function generateValidParenthesesDryRun(text: string, input: string): NonNullable<CodeFlowAnalysisResult["dryRun"]> {
  const columns = dryRunSchemas.stack.columns;
  const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
  const stack: string[] = [];
  const rows: Array<Record<string, string>> = [];
  let valid = true;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const before = formatArrayLike(stack);
    const isOpen = "([{".includes(char);
    let popped = "-";
    let operation = "Ignore non-bracket";
    let condition = "not a bracket";
    if (isOpen) {
      stack.push(char);
      operation = "Push opening bracket";
      condition = "opening bracket";
    } else if (char in pairs) {
      popped = stack.pop() ?? "empty";
      valid = valid && popped === pairs[char];
      operation = popped === pairs[char] ? "Pop matching bracket" : "Mismatch found";
      condition = `${popped} matches ${pairs[char]} = ${popped === pairs[char]}`;
    }
    rows.push(normalizeRow({
      Step: String(index + 1),
      "Current Element": char,
      "Stack Before": before,
      Condition: condition,
      Operation: operation,
      "Popped Elements": popped,
      "Stack After": formatArrayLike(stack),
      "Answer Update": String(valid && stack.length === 0),
      Explanation: isOpen ? "Opening brackets wait on the stack for a matching closer." : "Closing brackets must match the latest unmatched opening bracket.",
    }, columns, index + 1));
  }

  return exactDryRun("stack", input, rows, String(valid && stack.length === 0));
}

function generateNextGreaterDryRun(nums: number[], input: string): NonNullable<CodeFlowAnalysisResult["dryRun"]> {
  const columns = dryRunSchemas.stack.columns;
  const stack: number[] = [];
  const ans = Array.from({ length: nums.length }, () => -1);
  const rows: Array<Record<string, string>> = [];
  let step = 1;
  for (let i = 0; i < nums.length; i += 1) {
    const before = formatArray(stack.map((index) => nums[index]));
    const popped: number[] = [];
    while (stack.length && nums[stack[stack.length - 1]] < nums[i]) {
      const index = stack.pop()!;
      ans[index] = nums[i];
      popped.push(nums[index]);
    }
    stack.push(i);
    rows.push(normalizeRow({
      Step: String(step++),
      "Current Element": `${nums[i]} at ${i}`,
      "Stack Before": before,
      Condition: `pop while stack top < ${nums[i]}`,
      Operation: "Resolve smaller previous values, then push current",
      "Popped Elements": formatArray(popped),
      "Stack After": formatArray(stack.map((index) => nums[index])),
      "Answer Update": formatArray(ans),
      Explanation: "A greater current value becomes the next greater element for smaller values waiting on the stack.",
    }, columns, step));
  }
  return exactDryRun("stack", input, rows, formatArray(ans));
}

function generateBasicDPDryRun(n: number, input: string): NonNullable<CodeFlowAnalysisResult["dryRun"]> {
  const columns = dryRunSchemas.dp.columns;
  const size = Math.max(0, n);
  const dp = Array.from({ length: Math.max(size + 1, 2) }, () => 0);
  dp[0] = 0;
  dp[1] = 1;
  const rows: Array<Record<string, string>> = [];
  for (let i = 2; i <= size; i += 1) {
    const value = dp[i - 1] + dp[i - 2];
    dp[i] = value;
    rows.push(normalizeRow({
      Step: String(i - 1),
      State: `dp[${i}]`,
      Formula: `dp[${i - 1}] + dp[${i - 2}]`,
      "Previous Values": `${dp[i - 1]} + ${dp[i - 2]}`,
      "Updated Value": String(value),
      "DP State": formatArray(dp.slice(0, size + 1)),
      Action: `Set dp[${i}] = ${value}`,
      Explanation: "This basic DP state uses the two previous states, as in Fibonacci/climbing-stairs style transitions.",
    }, columns, i - 1));
  }
  return exactDryRun("dp", input, rows, String(dp[size] ?? 0));
}

function generateHouseRobberDPDryRun(nums: number[], input: string): NonNullable<CodeFlowAnalysisResult["dryRun"]> {
  const columns = dryRunSchemas.dp.columns;
  const dp = Array.from({ length: nums.length + 1 }, () => 0);
  const rows: Array<Record<string, string>> = [];
  for (let i = 1; i <= nums.length; i += 1) {
    const take = nums[i - 1] + (dp[i - 2] ?? 0);
    const skip = dp[i - 1];
    dp[i] = Math.max(take, skip);
    rows.push(normalizeRow({
      Step: String(i),
      State: `dp[${i}]`,
      Formula: `max(dp[${i - 1}], nums[${i - 1}] + dp[${i - 2}])`,
      "Previous Values": `skip=${skip}, take=${take}`,
      "Updated Value": String(dp[i]),
      "DP State": formatArray(dp),
      Action: take > skip ? "Take current value" : "Skip current value",
      Explanation: "Choose the better result between skipping this item or taking it with the compatible previous state.",
    }, columns, i));
  }
  return exactDryRun("dp", input, rows, String(dp[nums.length]));
}

function exactDryRun(pattern: DryRunPattern, input: string, rows: Array<Record<string, string>>, finalOutput: string): NonNullable<CodeFlowAnalysisResult["dryRun"]> {
  const schema = dryRunSchemas[pattern];
  return {
    input,
    confidence: "Exact deterministic dry run",
    columns: schema.columns,
    rows,
    variableWatch: buildVariableWatch(rows, schema),
    snapshots: buildSnapshots(rows, schema),
    finalOutput,
    warnings: [`Exact deterministic ${schema.label} dry run generated from the provided input.`],
  };
}

function parseWeightedGraphInput(input: string): WeightedGraphInput | null {
  const vertices = Number(input.match(/\b(?:v|vertices|n)\s*=\s*(\d+)/i)?.[1] ?? input.match(/^\s*(\d+)\s+\d+\s+-?\d+/)?.[1]);
  const source = Number(input.match(/\b(?:s|source|src)\s*=\s*(-?\d+)/i)?.[1] ?? input.match(/^\s*\d+\s+\d+\s+(-?\d+)/)?.[1] ?? 0);
  const edges = parseTriples(input);
  if (!Number.isFinite(vertices) || !edges.length || !Number.isFinite(source)) return null;
  return { vertices, edges, source };
}

function parseUnweightedGraphInput(input: string): GraphInput | null {
  const source = input.match(/\b(?:s|source|src)\s*=\s*([A-Za-z0-9_-]+)/i)?.[1] ?? "0";
  const pairs = parsePairs(input);
  const nodeSet = new Set<string>();
  pairs.forEach(([a, b]) => { nodeSet.add(String(a)); nodeSet.add(String(b)); });
  const nodeList = parseNamedArray(input, "nodes").map(String);
  nodeList.forEach((node) => nodeSet.add(node));
  if (!pairs.length) return null;
  return { nodes: [...nodeSet], edges: pairs, source, directed: /directed\s*=\s*true/i.test(input) };
}

function parseNumsAndTarget(input: string) {
  const nums = parseNumberArray(input);
  const target = Number(input.match(/\btarget\s*=\s*(-?\d+)/i)?.[1] ?? input.match(/\bt\s*=\s*(-?\d+)/i)?.[1]);
  return nums.length && Number.isFinite(target) ? { nums, target } : null;
}

function parseNamedNumber(input: string, name: string) {
  const match = input.match(new RegExp(`\\b${name}\\s*=\\s*(-?\\d+)`, "i"));
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function parseNamedString(input: string, name: string) {
  const quoted = input.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i"))?.[1];
  if (quoted != null) return quoted;
  return input.match(new RegExp(`\\b${name}\\s*=\\s*([^,\\n]+)`, "i"))?.[1]?.trim() ?? null;
}

function parseNumberArray(input: string) {
  const numsMatch = input.match(/\b(?:nums|arr|array)\s*=\s*\[([^\]]*)\]/i);
  const source = numsMatch?.[1] ?? input.match(/\[([^\]]*)\]/)?.[1] ?? input;
  return (source.match(/-?\d+/g) ?? []).map(Number);
}

function parseTriples(input: string): Array<[number, number, number]> {
  const triples = [...input.matchAll(/\[\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*\]/g)].map((match) => [Number(match[1]), Number(match[2]), Number(match[3])] as [number, number, number]);
  if (triples.length) return triples;
  const lines = input.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return lines
    .map((line) => line.match(/^(-?\d+)\s+(-?\d+)\s+(-?\d+)$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => [Number(match[1]), Number(match[2]), Number(match[3])] as [number, number, number])
    .slice(1);
}

function parsePairs(input: string): Array<[string, string]> {
  return [...input.matchAll(/\[\s*([A-Za-z0-9_-]+)\s*,\s*([A-Za-z0-9_-]+)\s*\]/g)].map((match) => [match[1], match[2]]);
}

function parseNamedArray(input: string, name: string) {
  return (input.match(new RegExp(`\\b${name}\\s*=\\s*\\[([^\\]]*)\\]`, "i"))?.[1].match(/[A-Za-z0-9_-]+/g) ?? []);
}

function buildAdj(graph: GraphInput) {
  const adj = new Map<string, Array<string | number>>();
  graph.nodes.forEach((node) => adj.set(String(node), []));
  graph.edges.forEach(([a, b]) => {
    adj.set(String(a), [...(adj.get(String(a)) ?? []), b]);
    if (!graph.directed) adj.set(String(b), [...(adj.get(String(b)) ?? []), a]);
  });
  return adj;
}

function buildWeightedAdj(graph: WeightedGraphInput) {
  const adj = new Map<number, Array<[number, number]>>();
  for (let node = 0; node < graph.vertices; node += 1) adj.set(node, []);
  graph.edges.forEach(([from, to, weight]) => {
    adj.set(from, [...(adj.get(from) ?? []), [to, weight]]);
  });
  return adj;
}

function formatDistance(value: number) {
  return Number.isFinite(value) ? String(value) : "INF";
}

function formatDistances(values: number[]) {
  return `[${values.map(formatDistance).join(", ")}]`;
}

function formatArray(values: number[]) {
  return `[${values.join(", ")}]`;
}

function formatArrayLike(values: Array<string | number>) {
  return `[${values.join(", ")}]`;
}

function formatHeap(values: Array<[number, number]>) {
  return `[${values.map(([distance, node]) => `(${distance}, ${node})`).join(", ")}]`;
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
