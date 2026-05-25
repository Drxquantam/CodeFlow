"use client";

import type { TraceFrame } from "@/types/trace";

type Point = { x: number; y: number };

export default function GraphTraceRenderer({ frame }: { frame: TraceFrame }) {
  const graph = frame.graph;
  if (!graph) return null;

  const layout = buildComponentLayout(graph.nodes, graph.edges);
  const visited = new Set((graph.visited ?? []).map(String));
  const current = graph.currentNode == null ? "" : String(graph.currentNode);
  const target = graph.target == null ? "" : String(graph.target);
  const activeEdge = graph.activeEdge ? `${graph.activeEdge[0]}->${graph.activeEdge[1]}` : "";

  return (
    <svg viewBox="0 0 920 420" className="h-[420px] w-full rounded-md bg-[#101010]">
      <defs>
        <marker id="universalArrow" markerHeight="8" markerWidth="8" orient="auto" refX="8" refY="4">
          <path d="M0,0 L8,4 L0,8 Z" fill="#71717a" />
        </marker>
        <marker id="universalArrowActive" markerHeight="9" markerWidth="9" orient="auto" refX="9" refY="4.5">
          <path d="M0,0 L9,4.5 L0,9 Z" fill="#facc15" />
        </marker>
      </defs>
      {graph.edges.map(([from, to], index) => {
        const start = layout.get(String(from));
        const end = layout.get(String(to));
        if (!start || !end) return null;
        const key = `${from}->${to}`;
        const reverseKey = `${to}->${from}`;
        const active = activeEdge === key || (!graph.directed && activeEdge === reverseKey);

        return (
          <line
            key={`${key}-${index}`}
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            stroke={active ? "#facc15" : "#52525b"}
            strokeWidth={active ? 4 : 2}
            markerEnd={graph.directed ? (active ? "url(#universalArrowActive)" : "url(#universalArrow)") : undefined}
          />
        );
      })}
      {graph.nodes.map((node) => {
        const id = String(node);
        const point = layout.get(id);
        if (!point) return null;
        const isCurrent = id === current;
        const isTarget = id === target;
        const isVisited = visited.has(id);

        return (
          <g key={id}>
            <circle
              cx={point.x}
              cy={point.y}
              r={isCurrent ? 34 : 29}
              fill={isCurrent ? "#facc15" : isVisited ? "#14532d" : "#18181b"}
              stroke={isCurrent ? "#fde68a" : isTarget ? "#fb7185" : isVisited ? "#22c55e" : "#4ea1ff"}
              strokeWidth={isCurrent || isTarget ? 4 : 2}
            />
            <text x={point.x} y={point.y + 5} textAnchor="middle" fontSize="13" fontWeight="700" fill={isCurrent ? "#050505" : "#f4f4f5"}>
              {id}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function buildComponentLayout(
  nodes: Array<string | number>,
  edges: Array<[string | number, string | number]>,
) {
  const ids = nodes.map(String);
  const adjacency = new Map(ids.map((id) => [id, [] as string[]]));
  edges.forEach(([from, to]) => {
    adjacency.get(String(from))?.push(String(to));
    adjacency.get(String(to))?.push(String(from));
  });

  const seen = new Set<string>();
  const components: string[][] = [];
  ids.forEach((id) => {
    if (seen.has(id)) return;
    const queue = [id];
    const component: string[] = [];
    seen.add(id);
    while (queue.length) {
      const current = queue.shift()!;
      component.push(current);
      (adjacency.get(current) ?? []).forEach((next) => {
        if (!seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      });
    }
    components.push(component);
  });

  const layout = new Map<string, Point>();
  const componentWidth = 820 / Math.max(components.length, 1);

  components.forEach((component, componentIndex) => {
    const centerX = 50 + componentWidth * componentIndex + componentWidth / 2;
    const centerY = 210;
    const radius = Math.min(145, 55 + component.length * 22);

    component.forEach((node, index) => {
      const angle = (Math.PI * 2 * index) / Math.max(component.length, 1) - Math.PI / 2;
      layout.set(node, {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      });
    });
  });

  return layout;
}
