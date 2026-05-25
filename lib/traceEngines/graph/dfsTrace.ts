import type { TraceFrame } from "@/types/trace";

type GraphTraceInput = {
  nodes: Array<string | number>;
  edges: Array<[string | number, string | number]>;
  source: string | number;
  target?: string | number;
  directed?: boolean;
};

export function generateDFSTrace(input: GraphTraceInput): TraceFrame[] {
  const adjacency = buildAdjacency(input);
  const visited = new Set<string | number>();
  const frames: TraceFrame[] = [];
  const stack: Array<string | number> = [];
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
        stack: stack.join(" -> "),
      },
      graph: {
        nodes: input.nodes,
        edges: input.edges,
        visited: [...visited],
        currentNode,
        activeEdge,
        stack: [...stack],
        target: input.target,
        found,
        directed: input.directed,
      },
    });
  };

  pushFrame("Start DFS traversal", input.source, undefined, `Start from source ${input.source}.`);

  const dfs = (node: string | number) => {
    if (found) return;
    visited.add(node);
    stack.push(node);
    found = input.target === node;
    pushFrame(`Visit node ${node}`, node, undefined, found ? "Target found." : "Mark node as visited.");

    if (found) {
      stack.pop();
      return;
    }

    for (const next of adjacency.get(node) ?? []) {
      const edge: [string | number, string | number] = [node, next];
      pushFrame(`Explore edge ${node} -> ${next}`, node, edge, "Move to the next adjacent node.");

      if (visited.has(next)) {
        pushFrame(`Skip already visited node ${next}`, next, edge, "This node is already visited.");
        continue;
      }

      dfs(next);
      if (found) break;
    }

    pushFrame(`Backtrack from ${node}`, node, undefined, "Return to the previous call.");
    stack.pop();
  };

  if (input.nodes.includes(input.source)) {
    dfs(input.source);
  }

  pushFrame(
    found ? "DFS complete: target found" : "DFS complete: target not found",
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
