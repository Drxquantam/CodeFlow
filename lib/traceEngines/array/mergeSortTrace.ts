import type { TraceFrame } from "@/types/trace";

export function generateMergeSortTrace(nums: number[]): TraceFrame[] {
  const values = [...nums];
  const frames: TraceFrame[] = [];

  const pushFrame = (
    operation: string,
    activeIndices: number[],
    explanation: string,
    variables: Record<string, unknown> = {},
    comparingIndices: number[] = [],
    sortedIndices: number[] = [],
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
        sortedIndices,
      },
    });
  };

  pushFrame("Start merge sort", range(0, values.length - 1), "Initial array before recursive splitting.");

  const merge = (left: number, mid: number, right: number) => {
    const leftPart = values.slice(left, mid + 1);
    const rightPart = values.slice(mid + 1, right + 1);
    let i = 0;
    let j = 0;
    let k = left;

    pushFrame(
      `Merge [${left}, ${mid}] and [${mid + 1}, ${right}]`,
      range(left, right),
      "Compare both sorted halves and write the smaller value back.",
      { left, mid, right, leftPart: `[${leftPart.join(", ")}]`, rightPart: `[${rightPart.join(", ")}]` },
    );

    while (i < leftPart.length && j < rightPart.length) {
      const compareLeft = left + i;
      const compareRight = mid + 1 + j;
      pushFrame(
        `Compare ${leftPart[i]} and ${rightPart[j]}`,
        [k],
        "Choose the smaller value for the current write position.",
        { i, j, writeIndex: k },
        [compareLeft, compareRight],
      );

      values[k] = leftPart[i] <= rightPart[j] ? leftPart[i++] : rightPart[j++];
      pushFrame(`Write ${values[k]} at index ${k}`, [k], "Array state updates immediately after the write.", { writeIndex: k });
      k += 1;
    }

    while (i < leftPart.length) {
      values[k] = leftPart[i];
      pushFrame(`Copy remaining left value ${values[k]}`, [k], "Left half still has values to copy.", { writeIndex: k });
      i += 1;
      k += 1;
    }

    while (j < rightPart.length) {
      values[k] = rightPart[j];
      pushFrame(`Copy remaining right value ${values[k]}`, [k], "Right half still has values to copy.", { writeIndex: k });
      j += 1;
      k += 1;
    }

    pushFrame(`Merged range [${left}, ${right}]`, range(left, right), "This range is now sorted.", {}, [], range(left, right));
  };

  const sort = (left: number, right: number) => {
    if (left >= right) return;
    const mid = Math.floor((left + right) / 2);
    pushFrame(`Split range [${left}, ${right}]`, range(left, right), `Middle index is ${mid}.`, { left, mid, right });
    sort(left, mid);
    sort(mid + 1, right);
    merge(left, mid, right);
  };

  sort(0, values.length - 1);
  pushFrame("Merge sort complete", range(0, values.length - 1), "Final sorted array.", {}, [], range(0, values.length - 1));

  return frames;
}

function range(left: number, right: number) {
  if (right < left) return [];
  return Array.from({ length: right - left + 1 }, (_, index) => left + index);
}
