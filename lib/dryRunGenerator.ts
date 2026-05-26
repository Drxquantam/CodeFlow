import type { CodeFlowAnalysisResult } from "@/types/codeflowAnalysis";

const mergeSortColumns = [
  "Step",
  "Call",
  "Range",
  "Left Half",
  "Right Half",
  "Comparison",
  "Temp",
  "Action",
  "Array State",
];

const algorithmColumns: Record<string, string[]> = {
  "binary search": ["Step", "Low", "Mid", "High", "nums[mid]", "Condition", "Action"],
  "merge sort": mergeSortColumns,
  bfs: ["Step", "Current Node", "Neighbor", "Queue", "Visited", "Action"],
  dfs: ["Step", "Current Node", "Neighbor", "Stack/Recursion", "Visited", "Action"],
  dp: ["Step", "i", "j", "Formula", "Previous Values", "DP Update", "Action"],
};

export function enrichDryRunForAlgorithm(
  result: CodeFlowAnalysisResult,
  stdin: string,
): CodeFlowAnalysisResult {
  const algorithm = normalizeAlgorithm(result.detectedAlgorithm);
  const nums = parseNumberArray(stdin);

  if (algorithm === "merge sort" && nums.length > 0) {
    return {
      ...result,
      dryRun: generateMergeSortDryRun(nums, stdin),
    };
  }

  const columns = algorithmColumns[algorithm];
  if (columns && result.dryRun) {
    return {
      ...result,
      dryRun: {
        ...result.dryRun,
        columns,
        rows: result.dryRun.rows.map((row, index) => normalizeRow(row, columns, index + 1)),
      },
    };
  }

  return result;
}

function generateMergeSortDryRun(nums: number[], stdin: string): NonNullable<CodeFlowAnalysisResult["dryRun"]> {
  const array = [...nums];
  const rows: Array<Record<string, string>> = [];
  const variableWatch: NonNullable<CodeFlowAnalysisResult["dryRun"]>["variableWatch"] = [];
  const snapshots: NonNullable<CodeFlowAnalysisResult["dryRun"]>["snapshots"] = [];

  const pushRow = (row: Omit<Record<string, string>, "Step">) => {
    const step = rows.length + 1;
    const completeRow = normalizeRow({ Step: String(step), ...row }, mergeSortColumns, step);
    rows.push(completeRow);
    variableWatch.push({
      step,
      variables: {
        array: completeRow["Array State"],
        temp: completeRow.Temp || "-",
        range: completeRow.Range || "-",
      },
    });
    snapshots.push({
      step,
      title: completeRow.Action,
      description: explainMergeSortRow(completeRow),
      variables: {
        call: completeRow.Call || "-",
        range: completeRow.Range || "-",
        temp: completeRow.Temp || "-",
      },
    });
  };

  const sort = (low: number, high: number) => {
    pushRow({
      Call: `mergeSort(${low}, ${high})`,
      Range: `[${low}..${high}]`,
      "Left Half": "-",
      "Right Half": "-",
      Comparison: "-",
      Temp: "-",
      Action: low === high
        ? "Base case reached, single element is already sorted"
        : "Enter recursive merge sort call",
      "Array State": formatArray(array),
    });

    if (low >= high) return;

    const mid = Math.floor((low + high) / 2);
    pushRow({
      Call: `mergeSort(${low}, ${high})`,
      Range: `[${low}..${high}]`,
      "Left Half": `nums[${low}..${mid}] = ${formatArray(array.slice(low, mid + 1))}`,
      "Right Half": `nums[${mid + 1}..${high}] = ${formatArray(array.slice(mid + 1, high + 1))}`,
      Comparison: "-",
      Temp: "-",
      Action: "Split into left and right halves",
      "Array State": formatArray(array),
    });

    sort(low, mid);
    sort(mid + 1, high);
    merge(low, mid, high);
  };

  const merge = (low: number, mid: number, high: number) => {
    const left = array.slice(low, mid + 1);
    const right = array.slice(mid + 1, high + 1);
    const temp: number[] = [];
    let leftIndex = 0;
    let rightIndex = 0;

    pushRow({
      Call: `merge(${low}, ${mid}, ${high})`,
      Range: `[${low}..${high}]`,
      "Left Half": formatArray(left),
      "Right Half": formatArray(right),
      Comparison: "-",
      Temp: "[]",
      Action: "Start merging the two sorted halves",
      "Array State": formatArray(array),
    });

    while (leftIndex < left.length && rightIndex < right.length) {
      const takeLeft = left[leftIndex] <= right[rightIndex];
      temp.push(takeLeft ? left[leftIndex] : right[rightIndex]);
      pushRow({
        Call: `merge(${low}, ${mid}, ${high})`,
        Range: `[${low}..${high}]`,
        "Left Half": formatArray(left),
        "Right Half": formatArray(right),
        Comparison: `${left[leftIndex]} vs ${right[rightIndex]}`,
        Temp: formatArray(temp),
        Action: takeLeft ? "Take smaller element from left half" : "Take smaller element from right half",
        "Array State": formatArray(array),
      });
      if (takeLeft) leftIndex += 1;
      else rightIndex += 1;
    }

    while (leftIndex < left.length) {
      temp.push(left[leftIndex]);
      pushRow({
        Call: `merge(${low}, ${mid}, ${high})`,
        Range: `[${low}..${high}]`,
        "Left Half": formatArray(left),
        "Right Half": formatArray(right),
        Comparison: "-",
        Temp: formatArray(temp),
        Action: "Copy remaining element from left half",
        "Array State": formatArray(array),
      });
      leftIndex += 1;
    }

    while (rightIndex < right.length) {
      temp.push(right[rightIndex]);
      pushRow({
        Call: `merge(${low}, ${mid}, ${high})`,
        Range: `[${low}..${high}]`,
        "Left Half": formatArray(left),
        "Right Half": formatArray(right),
        Comparison: "-",
        Temp: formatArray(temp),
        Action: "Copy remaining element from right half",
        "Array State": formatArray(array),
      });
      rightIndex += 1;
    }

    temp.forEach((value, index) => {
      array[low + index] = value;
    });

    pushRow({
      Call: `merge(${low}, ${mid}, ${high})`,
      Range: `[${low}..${high}]`,
      "Left Half": formatArray(left),
      "Right Half": formatArray(right),
      Comparison: "-",
      Temp: formatArray(temp),
      Action: "Copy merged sorted values back to original array",
      "Array State": formatArray(array),
    });
  };

  if (array.length > 0) {
    sort(0, array.length - 1);
  }

  pushRow({
    Call: "mergeSort complete",
    Range: `[0..${Math.max(array.length - 1, 0)}]`,
    "Left Half": "-",
    "Right Half": "-",
    Comparison: "-",
    Temp: "-",
    Action: "Merge sort complete",
    "Array State": formatArray(array),
  });

  return {
    input: stdin,
    columns: mergeSortColumns,
    rows,
    variableWatch,
    snapshots,
    finalOutput: formatArray(array),
    warnings: ["Deterministic merge-sort dry run generated from the provided input array."],
  };
}

function normalizeRow(row: Record<string, string>, columns: string[], step: number) {
  return Object.fromEntries(
    columns.map((column) => [column, row[column] ?? (column === "Step" ? String(step) : "-")]),
  );
}

function explainMergeSortRow(row: Record<string, string>) {
  if (row.Action.includes("Base case")) return "A single element range is already sorted, so recursion returns without calculating a mid value.";
  if (row.Action.includes("Split")) return "The current range is divided into two smaller ranges before merging.";
  if (row.Action.includes("Take smaller")) return "The smaller front element is appended to temp so the merged range stays sorted.";
  if (row.Action.includes("Copy merged")) return "The completed temp array replaces the original range.";
  return row.Action;
}

function parseNumberArray(input: string) {
  const bracketMatch = input.match(/\[([^\]]+)\]/);
  const source = bracketMatch?.[1] ?? input;
  return (source.match(/-?\d+/g) ?? []).map(Number);
}

function formatArray(values: number[]) {
  return `[${values.join(", ")}]`;
}

function normalizeAlgorithm(value?: string) {
  return value?.toLowerCase().replace(/_/g, " ").trim() ?? "";
}
