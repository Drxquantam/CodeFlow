import type { TraceFrame } from "@/types/trace";

export function generateQuickSortTrace(nums: number[]): TraceFrame[] {
  const values = [...nums];
  const frames: TraceFrame[] = [];

  const pushFrame = (
    operation: string,
    explanation: string,
    activeIndices: number[] = [],
    comparingIndices: number[] = [],
    swappedIndices: number[] = [],
    variables: Record<string, unknown> = {},
  ) => {
    frames.push({
      step: frames.length + 1,
      type: "array",
      operation,
      explanation,
      variables,
      array: {
        values: [...values],
        activeIndices,
        comparingIndices,
        swappedIndices,
      },
    });
  };

  const partition = (low: number, high: number) => {
    const pivot = values[high];
    let i = low - 1;
    pushFrame(`Choose pivot ${pivot}`, `Pivot is at index ${high}.`, [high], [], [], { low, high, pivot });

    for (let j = low; j < high; j += 1) {
      pushFrame(`Compare ${values[j]} with pivot ${pivot}`, "Values <= pivot move to the left side.", [high], [j, high], [], { i, j });
      if (values[j] <= pivot) {
        i += 1;
        [values[i], values[j]] = [values[j], values[i]];
        pushFrame(`Swap index ${i} and ${j}`, "Expand the <= pivot partition.", [i, j], [], [i, j], { i, j });
      }
    }

    [values[i + 1], values[high]] = [values[high], values[i + 1]];
    pushFrame(`Place pivot at index ${i + 1}`, "Pivot is now in its final partition position.", [i + 1], [], [i + 1, high]);
    return i + 1;
  };

  const quickSort = (low: number, high: number) => {
    if (low >= high) return;
    const pivotIndex = partition(low, high);
    quickSort(low, pivotIndex - 1);
    quickSort(pivotIndex + 1, high);
  };

  pushFrame("Start quick sort", "Initial unsorted array.");
  quickSort(0, values.length - 1);
  pushFrame("Quick sort complete", "Final sorted array.", values.map((_, index) => index), [], [], { sorted: `[${values.join(", ")}]` });

  return frames;
}
