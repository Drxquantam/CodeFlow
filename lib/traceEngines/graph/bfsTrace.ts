import type { TraceFrame } from "@/types/trace";

type GraphTraceInput = {
  nodes: Array<string | number>;
  edges: Array<[string | number, string | number]>;
  source: string | number;
  target?: string | number;
  directed?: boolean;
};

export function generateBFSTrace(input: GraphTraceInput): TraceFrame[] {
  const adjacency = buildAdjacency(input);
  const visited = new Set<string | number>();
  const queue: Array<string | number> = [];
  const frames: TraceFrame[] = [];
  let found = false;

  const pushFrame = (
    operation: string,
    currentNode?: string | number,
    activeEdge?: [string | number, string | number],
    explanation?: string,
  ) => {
    frames.push({
      step: frames.length + 1,
      type: "graph",
      operation,
      explanation,
      variables: {
        visited: [...visited].join(", "),
        queue: queue.join(" <- "),
      },
      graph: {
        nodes: input.nodes,
        edges: input.edges,
        visited: [...visited],
        currentNode,
        activeEdge,
        queue: [...queue],
        target: input.target,
        found,
        directed: input.directed,
      },
    });
  };

  if (!input.nodes.includes(input.source)) {
    pushFrame("BFS cannot start", undefined, undefined, "Source is not present in nodes.");
    return frames;
  }

  visited.add(input.source);
  queue.push(input.source);
  pushFrame("Enqueue source", input.source, undefined, `Start BFS from ${input.source}.`);

  while (queue.length && !found) {
    const node = queue.shift()!;
    found = input.target === node;
    pushFrame(`Dequeue ${node}`, node, undefined, found ? "Target found." : "Process front of queue.");

    if (found) break;

    for (const next of adjacency.get(node) ?? []) {
      const edge: [string | number, string | number] = [node, next];
      pushFrame(`Explore edge ${node} -> ${next}`, node, edge, "Check adjacent node.");

      if (visited.has(next)) {
        pushFrame(`Skip already visited node ${next}`, next, edge, "Already discovered earlier.");
        continue;
      }

      visited.add(next);
      queue.push(next);
      found = input.target === next;
      pushFrame(`Enqueue ${next}`, next, edge, found ? "Target found while enqueuing." : "Mark visited and enqueue.");
      if (found) break;
    }
  }

  pushFrame(
    found ? "BFS complete: target found" : "BFS complete: target not found",
    undefined,
    undefined,
    "Disconnected components remain visible but are not visited from the selected source.",
  );

  return frames;
}

function buildAdjacency(input: GraphTraceInput) {
  const adjacency = new Map<string | number, Array<string | number>>();
  input.nodes.forEach((node) => adjacency.set(node, []));
  input.edges.forEach(([from, to]) => {
    adjacency.get(from)?.push(to);
    if (!input.directed) adjacency.get(to)?.push(from);
  });
  return adjacency;
}
