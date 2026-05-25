import type { TraceFrame } from "@/types/trace";

type BinarySearchInput = {
  nums: number[];
  target: number;
};

export function generateBinarySearchTrace(input: BinarySearchInput): TraceFrame[] {
  const frames: TraceFrame[] = [];
  let low = 0;
  let high = input.nums.length - 1;
  let found = false;

  const pushFrame = (operation: string, mid: number | undefined, explanation: string) => {
    frames.push({
      step: frames.length + 1,
      type: "array",
      operation,
      explanation,
      variables: { low, mid: mid ?? "-", high, target: input.target },
      array: {
        values: input.nums,
        activeIndices: [low, high, mid].filter((value): value is number => value != null && value >= 0),
        comparingIndices: mid == null ? [] : [mid],
        low,
        mid,
        high,
      },
    });
  };

  pushFrame("Start binary search", undefined, "Search inside the full sorted array.");

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    pushFrame(`Check middle index ${mid}`, mid, `nums[${mid}] = ${input.nums[mid]}.`);

    if (input.nums[mid] === input.target) {
      found = true;
      pushFrame(`Target ${input.target} found`, mid, `Found at index ${mid}.`);
      break;
    }

    if (input.nums[mid] < input.target) {
      low = mid + 1;
      pushFrame("Move low right", mid, "Middle value is smaller than target.");
    } else {
      high = mid - 1;
      pushFrame("Move high left", mid, "Middle value is larger than target.");
    }
  }

  if (!found) {
    pushFrame(`Target ${input.target} not found`, undefined, "Search interval is empty.");
  }

  return frames;
}
