import type { TraceFrame } from "@/types/trace";

type DPTableInput = {
  table: Array<Array<number | string>>;
  updates: Array<{
    cell: [number, number];
    value: number | string;
    operation?: string;
    explanation?: string;
  }>;
};

export function generateDPTableTrace(input: DPTableInput): TraceFrame[] {
  const table = input.table.map((row) => [...row]);
  const updatedCells: Array<[number, number]> = [];
  const frames: TraceFrame[] = [
    {
      step: 1,
      type: "dp",
      operation: "Initialize DP table",
      explanation: "Start with the provided initial table.",
      dp: {
        table: table.map((row) => [...row]),
        updatedCells: [],
      },
    },
  ];

  input.updates.forEach((update) => {
    const [row, column] = update.cell;
    if (!table[row]) return;
    table[row][column] = update.value;
    updatedCells.push(update.cell);
    frames.push({
      step: frames.length + 1,
      type: "dp",
      operation: update.operation ?? `Update dp[${row}][${column}]`,
      explanation: update.explanation,
      variables: { row, column, value: update.value },
      dp: {
        table: table.map((item) => [...item]),
        activeCell: update.cell,
        updatedCells: [...updatedCells],
      },
    });
  });

  return frames;
}
