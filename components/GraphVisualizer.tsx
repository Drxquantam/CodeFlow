"use client";

import { Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { TraceResponse } from "@/app/api/trace/route";
import { normalizeInputForVisualizer } from "@/lib/inputNormalizer";

type GraphVisualizerProps = {
  trace: TraceResponse | null;
  loading: boolean;
  error: string;
  onGenerate: () => void;
  stdin?: string;
  code?: string;
};

type EnhancedTrace = Omit<TraceResponse, "visualType"> & {
  visualType:
    | TraceResponse["visualType"]
    | "toposort";
  meta?: {
    words?: string[];
    order?: string;
    queue?: string[];
    result?: string;
    indegree?: Record<string, number>;
    values?: string[];
    source?: string;
    positions?: Record<string, { x: number; y: number }>;
  };
};

export default function GraphVisualizer({
  trace,
  loading,
  error,
  onGenerate,
  stdin = "",
  code = "",
}: GraphVisualizerProps) {
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(900);
  const normalizedTrace = useMemo(
    () => normalizeTraceForVisualization(trace, stdin, code),
    [trace, stdin, code],
  );
  const layout = useMemo(
    () => (normalizedTrace ? buildLayout(normalizedTrace) : null),
    [normalizedTrace],
  );
  const maxFrame = Math.max((normalizedTrace?.steps.length ?? 1) - 1, 0);
  const visibleFrame = Math.min(frame, maxFrame);
  const currentStep = normalizedTrace?.steps[visibleFrame] ?? null;
  const highlight = useMemo(
    () => buildHighlight(normalizedTrace, visibleFrame),
    [normalizedTrace, visibleFrame],
  );

  useEffect(() => {
    if (!playing || !normalizedTrace?.steps.length) return;

    const timer = window.setInterval(() => {
      setFrame((current) => {
        if (current >= maxFrame) {
          setPlaying(false);
          return current;
        }

        return current + 1;
      });
    }, speed);

    return () => window.clearInterval(timer);
  }, [playing, normalizedTrace, maxFrame, speed]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/[0.08] bg-[#111] p-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-400">
            Animated Data Structure Visualizer
          </h3>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Generates a trace and animates how nodes, edges, arrays, or recursion states change.
          </p>
        </div>
        <button
          type="button"
          onClick={onGenerate}
          disabled={loading}
          className="rounded-md bg-white px-4 py-2 text-sm font-bold text-black transition hover:bg-zinc-200 disabled:cursor-wait disabled:bg-zinc-500"
        >
          {loading ? "Generating..." : "Generate Animation"}
        </button>
      </div>

      {error ? (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <div className="rounded-md border border-white/[0.08] bg-[#111] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-400">
            {trace ? `${trace.visualType} animation` : "Waiting for trace"}
          </h3>
          <span className="text-xs text-zinc-500">
            {normalizedTrace
              ? `${normalizedTrace.nodes.length} nodes | ${normalizedTrace.edges.length} edges`
              : "Groq powered"}
          </span>
        </div>

        {normalizedTrace ? (
          <div className="mb-4 rounded-md border border-white/[0.08] bg-black/40 p-3">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setFrame((value) => Math.max(0, value - 1))}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-white/[0.1] bg-white/[0.04] px-3 text-sm text-zinc-300 transition hover:border-white/25 hover:text-white"
              >
                <SkipBack className="h-4 w-4" />
                Prev
              </button>
              <button
                type="button"
                onClick={() => setPlaying((value) => !value)}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-white px-3 text-sm font-bold text-black transition hover:bg-zinc-200"
              >
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {playing ? "Pause" : "Play"}
              </button>
              <button
                type="button"
                onClick={() => setFrame((value) => Math.min(maxFrame, value + 1))}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-white/[0.1] bg-white/[0.04] px-3 text-sm text-zinc-300 transition hover:border-white/25 hover:text-white"
              >
                Next
                <SkipForward className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setPlaying(false);
                  setFrame(0);
                }}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-white/[0.1] bg-white/[0.04] px-3 text-sm text-zinc-300 transition hover:border-white/25 hover:text-white"
              >
                <RotateCcw className="h-4 w-4" />
                Restart
              </button>
              <label className="ml-auto flex items-center gap-2 text-xs font-semibold text-zinc-500">
                Speed
                <select
                  value={speed}
                  onChange={(event) => setSpeed(Number(event.target.value))}
                  className="h-8 rounded-md border border-white/[0.1] bg-[#111] px-2 text-zinc-200 outline-none"
                >
                  <option value={1300}>Slow</option>
                  <option value={900}>Normal</option>
                  <option value={450}>Fast</option>
                </select>
              </label>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="h-full bg-signal-blue transition-all duration-300"
                style={{
                  width: `${((visibleFrame + 1) / Math.max(normalizedTrace.steps.length, 1)) * 100}%`,
                }}
              />
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              <span className="font-bold text-white">Step {currentStep?.step ?? frame + 1}:</span>{" "}
              {currentStep?.action ?? "Ready"}
            </p>
            {currentStep?.note ? (
              <p className="mt-1 text-xs leading-5 text-zinc-500">{currentStep.note}</p>
            ) : null}
            {normalizedTrace.visualType === "toposort" ? (
              <TopoStatePanel trace={normalizedTrace} currentStep={currentStep} />
            ) : null}
          </div>
        ) : null}

        {layout && normalizedTrace ? (
          normalizedTrace.visualType === "array" || normalizedTrace.visualType === "queue" || normalizedTrace.visualType === "stack" ? (
            <ArrayVisualizer trace={normalizedTrace} highlight={highlight} />
          ) : normalizedTrace.visualType === "linked-list" ? (
            <LinkedListVisualizer trace={normalizedTrace} currentStep={currentStep} />
          ) : normalizedTrace.visualType === "recursion" ? (
            <RecursionVisualizer trace={normalizedTrace} currentStep={currentStep} highlight={highlight} />
          ) : normalizedTrace.visualType === "grid" || normalizedTrace.visualType === "dp" ? (
            <GridVisualizer trace={normalizedTrace} highlight={highlight} />
          ) : (
          <svg viewBox="0 0 920 520" className="h-[520px] w-full rounded-md bg-[#121212]">
            <defs>
              <marker id="arrow" markerHeight="8" markerWidth="8" orient="auto" refX="8" refY="4">
                <path d="M0,0 L8,4 L0,8 Z" fill="#52525b" />
              </marker>
              <marker id="arrowActive" markerHeight="9" markerWidth="9" orient="auto" refX="9" refY="4.5">
                <path d="M0,0 L9,4.5 L0,9 Z" fill="#facc15" />
              </marker>
            </defs>
            {normalizedTrace?.edges.map((edge) => {
              const from = layout.get(edge.from);
              const to = layout.get(edge.to);
              if (!from || !to) return null;
              const edgeKey = `${edge.from}->${edge.to}`;
              const reverseEdgeKey = `${edge.to}->${edge.from}`;
              const isActive =
                highlight.activeEdges.has(edgeKey) || highlight.activeEdges.has(reverseEdgeKey);

              return (
                <g key={`${edge.from}-${edge.to}-${edge.label ?? ""}`}>
                  <line
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke={isActive ? "#facc15" : "#52525b"}
                    strokeWidth={isActive ? "4" : "2"}
                    markerEnd={isActive ? "url(#arrowActive)" : "url(#arrow)"}
                    className="transition-all duration-300"
                  />
                  {edge.label ? (
                    <text
                      x={(from.x + to.x) / 2}
                      y={(from.y + to.y) / 2 - 8}
                      textAnchor="middle"
                      fontSize="11"
                      fill="#a1a1aa"
                    >
                      {edge.label}
                    </text>
                  ) : null}
                </g>
              );
            })}
            {normalizedTrace?.nodes.map((node, index) => {
              const point = layout.get(node.id);
              if (!point) return null;
              const isActive = highlight.activeNodes.has(node.id);
              const isVisited = highlight.visitedNodes.has(node.id);

              return (
                <g key={node.id}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={isActive ? "36" : "30"}
                    fill={
                      isActive
                        ? "#facc15"
                        : isVisited
                          ? "#14532d"
                          : index === 0
                            ? "#1d4ed8"
                            : "#18181b"
                    }
                    stroke={
                      isActive
                        ? "#fde68a"
                        : isVisited
                          ? "#22c55e"
                          : index === 0
                            ? "#93c5fd"
                            : "#4ea1ff"
                    }
                    strokeWidth={isActive ? "4" : "2"}
                    className="transition-all duration-300"
                  />
                  {normalizedTrace.visualType === "toposort" ? (
                    <text
                      x={point.x}
                      y={point.y + 50}
                      textAnchor="middle"
                      fontSize="11"
                      fill="#a1a1aa"
                    >
                      in: {currentStep?.variables?.[`in_${node.id}`] ?? normalizedTrace.meta?.indegree?.[node.id] ?? 0}
                    </text>
                  ) : null}
                  <text
                    x={point.x}
                    y={point.y + 5}
                    textAnchor="middle"
                    fontSize="12"
                    fontWeight="700"
                    fill={isActive ? "#050505" : "#f4f4f5"}
                    className="transition-colors duration-300"
                  >
                    {node.label.slice(0, 10)}
                  </text>
                </g>
              );
            })}
          </svg>
          )
        ) : (
          <div className="grid h-[520px] place-items-center rounded-md border border-dashed border-white/[0.12] text-sm text-zinc-500">
            Click Generate Animation to render your code structure.
          </div>
        )}
      </div>
    </div>
  );
}

function buildLayout(trace: EnhancedTrace) {
  if (trace.meta?.positions) {
    const manualLayout = new Map<string, { x: number; y: number }>();

    trace.nodes.forEach((node) => {
      const point = trace.meta?.positions?.[node.id];
      if (point) {
        manualLayout.set(node.id, point);
      }
    });

    if (manualLayout.size === trace.nodes.length) {
      return manualLayout;
    }
  }

  if (trace.visualType === "toposort") {
    return buildDagLayout(trace);
  }

  if (trace.visualType === "graph") {
    return buildDirectedGraphLayout(trace);
  }

  const layout = new Map<string, { x: number; y: number }>();
  const count = Math.max(trace.nodes.length, 1);
  const columns = Math.min(4, Math.ceil(Math.sqrt(count)));
  const rows = Math.ceil(count / columns);
  const width = 820;
  const height = 390;
  const xGap = width / Math.max(columns - 1, 1);
  const yGap = height / Math.max(rows - 1, 1);

  trace.nodes.forEach((node, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    layout.set(node.id, {
      x: 50 + (columns === 1 ? width / 2 : column * xGap),
      y: 50 + (rows === 1 ? height / 2 : row * yGap),
    });
  });

  return layout;
}

function buildDirectedGraphLayout(trace: EnhancedTrace) {
  const tufLayout = buildTufStyleWeightedGraphLayout(trace);
  if (tufLayout) return tufLayout;

  return buildForceGraphLayout(trace);
}

function buildTufStyleWeightedGraphLayout(trace: EnhancedTrace) {
  const edgeKeys = new Set(
    trace.edges.map((edge) => `${edge.from}->${edge.to}:${String(edge.label)}`),
  );

  const isTargetGraph =
    trace.nodes.length === 6 &&
    edgeKeys.has("0->1:5") &&
    edgeKeys.has("1->2:-2") &&
    edgeKeys.has("1->5:-3") &&
    edgeKeys.has("5->3:1") &&
    edgeKeys.has("3->2:6") &&
    edgeKeys.has("2->4:3") &&
    edgeKeys.has("3->4:-2");

  if (!isTargetGraph) return null;

  const layout = new Map<string, { x: number; y: number }>();

  layout.set("0", { x: 110, y: 70 });
  layout.set("1", { x: 110, y: 210 });
  layout.set("5", { x: 110, y: 360 });
  layout.set("2", { x: 390, y: 210 });
  layout.set("3", { x: 390, y: 360 });
  layout.set("4", { x: 690, y: 285 });

  return layout;
}

function buildForceGraphLayout(trace: EnhancedTrace) {
  const layout = new Map<string, { x: number; y: number }>();
  const centerX = 460;
  const centerY = 260;
  const width = 760;
  const height = 380;
  const radius = Math.min(180, 95 + trace.nodes.length * 12);

  trace.nodes.forEach((node, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(trace.nodes.length, 1) - Math.PI / 2;
    const wobble = index % 2 === 0 ? 28 : -24;

    layout.set(node.id, {
      x: centerX + Math.cos(angle) * (radius + wobble),
      y: centerY + Math.sin(angle) * (radius - wobble),
    });
  });

  const source = trace.meta?.source ?? inferGraphSource(trace);
  if (source && layout.has(source)) {
    layout.set(source, { x: 110, y: centerY });
  }

  const velocities = new Map(trace.nodes.map((node) => [node.id, { x: 0, y: 0 }]));
  const area = width * height;
  const idealDistance = Math.sqrt(area / Math.max(trace.nodes.length, 1));

  for (let tick = 0; tick < 180; tick += 1) {
    const temperature = Math.max(8, 64 * (1 - tick / 180));

    for (let i = 0; i < trace.nodes.length; i += 1) {
      for (let j = i + 1; j < trace.nodes.length; j += 1) {
        const a = trace.nodes[i].id;
        const b = trace.nodes[j].id;
        const pointA = layout.get(a)!;
        const pointB = layout.get(b)!;
        const velocityA = velocities.get(a)!;
        const velocityB = velocities.get(b)!;
        const dx = pointA.x - pointB.x || 0.01;
        const dy = pointA.y - pointB.y || 0.01;
        const distance = Math.max(20, Math.hypot(dx, dy));
        const force = (idealDistance * idealDistance) / distance;
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;

        velocityA.x += fx;
        velocityA.y += fy;
        velocityB.x -= fx;
        velocityB.y -= fy;
      }
    }

    trace.edges.forEach((edge) => {
      const from = layout.get(edge.from);
      const to = layout.get(edge.to);
      const fromVelocity = velocities.get(edge.from);
      const toVelocity = velocities.get(edge.to);
      if (!from || !to || !fromVelocity || !toVelocity) return;

      const dx = from.x - to.x || 0.01;
      const dy = from.y - to.y || 0.01;
      const distance = Math.max(20, Math.hypot(dx, dy));
      const force = (distance * distance) / idealDistance;
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;

      fromVelocity.x -= fx;
      fromVelocity.y -= fy;
      toVelocity.x += fx;
      toVelocity.y += fy;
    });

    trace.nodes.forEach((node) => {
      const point = layout.get(node.id)!;
      const velocity = velocities.get(node.id)!;
      const centerPullX = (centerX - point.x) * 0.025;
      const centerPullY = (centerY - point.y) * 0.025;
      const vx = velocity.x + centerPullX;
      const vy = velocity.y + centerPullY;
      const length = Math.max(0.01, Math.hypot(vx, vy));
      const move = Math.min(length, temperature);

      point.x = Math.max(70, Math.min(850, point.x + (vx / length) * move));
      point.y = Math.max(70, Math.min(450, point.y + (vy / length) * move));
      velocity.x = 0;
      velocity.y = 0;
    });
  }

  return layout;
}

function inferGraphSource(trace: EnhancedTrace) {
  const incoming = new Map(trace.nodes.map((node) => [node.id, 0]));
  trace.edges.forEach((edge) => {
    incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1);
  });

  return trace.nodes.find((node) => node.id === "0")?.id
    ?? trace.nodes.find((node) => node.id === "1")?.id
    ?? trace.nodes.find((node) => (incoming.get(node.id) ?? 0) === 0)?.id
    ?? trace.nodes[0]?.id;
}

function buildDagLayout(trace: EnhancedTrace) {
  const layout = new Map<string, { x: number; y: number }>();
  const incoming = new Map(trace.nodes.map((node) => [node.id, 0]));
  const outgoing = new Map<string, string[]>();

  trace.edges.forEach((edge) => {
    incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1);
    outgoing.set(edge.from, [...(outgoing.get(edge.from) ?? []), edge.to]);
  });

  const queue = trace.nodes.filter((node) => (incoming.get(node.id) ?? 0) === 0).map((node) => node.id);
  const levels = new Map<string, number>();
  queue.forEach((node) => levels.set(node, 0));

  while (queue.length) {
    const node = queue.shift()!;
    const level = levels.get(node) ?? 0;
    (outgoing.get(node) ?? []).forEach((next) => {
      const nextLevel = Math.max(levels.get(next) ?? 0, level + 1);
      levels.set(next, nextLevel);
      queue.push(next);
    });
  }

  trace.nodes.forEach((node, index) => {
    if (!levels.has(node.id)) {
      levels.set(node.id, index % 3);
    }
  });

  const grouped = new Map<number, string[]>();
  trace.nodes.forEach((node) => {
    const level = levels.get(node.id) ?? 0;
    grouped.set(level, [...(grouped.get(level) ?? []), node.id]);
  });

  const sortedLevels = [...grouped.keys()].sort((a, b) => a - b);
  const xGap = 760 / Math.max(sortedLevels.length - 1, 1);
  sortedLevels.forEach((level, levelIndex) => {
    const nodes = grouped.get(level) ?? [];
    const yGap = 300 / Math.max(nodes.length - 1, 1);
    nodes.forEach((node, nodeIndex) => {
      layout.set(node, {
        x: 80 + (sortedLevels.length === 1 ? 380 : levelIndex * xGap),
        y: 110 + (nodes.length === 1 ? 150 : nodeIndex * yGap),
      });
    });
  });

  return layout;
}

function normalizeTraceForVisualization(
  trace: TraceResponse | null,
  stdin: string,
  code: string,
): EnhancedTrace | null {
  if (!trace) return null;
  const normalizedInput = normalizeInputForVisualizer(stdin);
  const inputShape = detectInputShape(stdin);
  const codeIntent = detectCodeIntent(code);

  if (inputShape.kind === "linked-list" && codeIntent.kind === "linked-list") {
    const linkedListTrace = buildLinkedListTrace(stdin);
    if (linkedListTrace) return linkedListTrace;
  }

  if (inputShape.kind === "array" && codeIntent.kind === "array-hash") {
    const hashTrace = buildArrayHashLookupTrace(stdin);
    if (hashTrace) return hashTrace;
  }

  if (inputShape.kind === "array" && codeIntent.kind === "array-sort") {
    const sortTrace = buildMergeSortTrace(stdin);
    if (sortTrace) return sortTrace;
  }

  if (
    inputShape.kind === "array" &&
    trace.visualType === "array" &&
    trace.steps.some((step) => /merge|sort|sorted/i.test(`${step.action} ${step.note}`))
  ) {
    const sortTrace = buildMergeSortTrace(stdin);
    if (sortTrace) return sortTrace;
  }

  if (inputShape.kind === "scalar" && codeIntent.kind === "recursion") {
    const recursionTrace = buildRecursionTrace(stdin, codeIntent.functionName);
    if (recursionTrace) return recursionTrace;
  }

  if (inputShape.kind === "dictionary" && codeIntent.kind === "toposort") {
    const alienTrace = buildDictionaryToposortTrace(normalizedInput);
    if (alienTrace) return alienTrace;
  }

  const parsed = parseEdgeList(normalizedInput);
  if (!parsed || (inputShape.kind !== "graph" && codeIntent.kind !== "graph")) return trace;

  const nodes = Array.from({ length: parsed.n }, (_, index) => {
    const id = String(parsed.base === 0 ? index : index + 1);
    return { id, label: id, group: "input" };
  });
  const edges = parsed.edges.map(([from, to, weight]) => ({
    from: String(from),
    to: String(to),
    label: weight == null ? `${from}-${to}` : String(weight),
  }));
  const edgeSet = new Set(edges.flatMap((edge) => [`${edge.from}->${edge.to}`, `${edge.to}->${edge.from}`]));

  return {
    ...trace,
    visualType: "graph",
    nodes,
    edges,
    meta: { source: parsed.source == null ? undefined : String(parsed.source) },
    steps: trace.steps.map((step) => {
      const stepText = `${step.action} ${step.note}`;
      const mentionedEdge = extractEdgeFromText(stepText);
      const mentionedVertices = extractVerticesFromText(stepText, nodes.map((node) => node.id));
      const activeEdges = mentionedEdge
        ? [`${mentionedEdge[0]}->${mentionedEdge[1]}`].filter((edge) => edgeSet.has(edge))
        : step.activeEdges?.filter((edge) => edgeSet.has(edge)) ?? [];
      const activeNodes = mentionedEdge
        ? [String(mentionedEdge[0]), String(mentionedEdge[1])]
        : mentionedVertices.length
          ? mentionedVertices
        : step.activeNodes?.filter((node) => nodes.some((item) => item.id === node)) ?? [];

      return {
        ...step,
        activeEdges,
        activeNodes,
      };
    }),
  };
}

type InputShape =
  | { kind: "array" }
  | { kind: "dictionary" }
  | { kind: "graph" }
  | { kind: "linked-list" }
  | { kind: "scalar" }
  | { kind: "unknown" };

type CodeIntent =
  | { kind: "array-hash" }
  | { kind: "array-sort" }
  | { kind: "graph" }
  | { kind: "linked-list" }
  | { kind: "recursion"; functionName: string }
  | { kind: "toposort" }
  | { kind: "unknown" };

function detectInputShape(stdin: string): InputShape {
  const normalizedInput = normalizeInputForVisualizer(stdin);
  const trimmed = stdin.trim();

  if (/head\s*=\s*\[[^\]]+\]/i.test(trimmed) || normalizedInput.startsWith("list\n")) {
    return { kind: "linked-list" };
  }

  if (/dict\s*=\s*\[[^\]]+\]/i.test(trimmed) || parseDictionaryInput(normalizedInput)) {
    return { kind: "dictionary" };
  }

  if (parseArrayWithTarget(stdin) || /(?:arr|nums|array|input)\s*=\s*\[[^\]]+\]/i.test(trimmed)) {
    return { kind: "array" };
  }

  if (parseEdgeList(normalizedInput)) {
    return { kind: "graph" };
  }

  if (readNamedNumber(trimmed, "n") != null || /^-?\d+$/.test(trimmed)) {
    return { kind: "scalar" };
  }

  return { kind: "unknown" };
}

function detectCodeIntent(code: string): CodeIntent {
  if (/\bListNode\b|->\s*next|\bnextNode\b|\bprev\b[\s\S]*\bcurr\b/.test(code)) {
    return { kind: "linked-list" };
  }

  if (/merge\s*sort|mergeSort|mergesort|\bmerge\s*\(|\bsort\s*\(/i.test(code)) {
    return { kind: "array-sort" };
  }

  const recursiveFunction = findRecursiveFunctionName(code);
  if (recursiveFunction) {
    return { kind: "recursion", functionName: recursiveFunction };
  }

  if (/\bindegree\b|\btopo|findOrder|constructorder|\bdict\b/i.test(code)) {
    return { kind: "toposort" };
  }

  if (/\badj\b|vector\s*<\s*vector|queue\s*<|stack\s*<|\bdfs\b|\bbfs\b/i.test(code)) {
    return { kind: "graph" };
  }

  if (/unordered_map|map\s*<|target|complement|need\s*=|seen\./i.test(code)) {
    return { kind: "array-hash" };
  }

  return { kind: "unknown" };
}

function findRecursiveFunctionName(code: string) {
  const functionMatches = [...code.matchAll(/\b(?:int|long|void|bool|string|double|float|auto)\s+([A-Za-z_]\w*)\s*\([^)]*\)\s*\{/g)];

  return functionMatches.find((match) => {
    const name = match[1];
    const afterSignature = code.slice((match.index ?? 0) + match[0].length);
    const bodyPreview = afterSignature.slice(0, 1600);
    return new RegExp(`\\b${name}\\s*\\(`).test(bodyPreview);
  })?.[1] ?? null;
}

function buildLinkedListTrace(stdin: string): EnhancedTrace | null {
  const values = parseLinkedListValues(stdin);
  if (!values.length) return null;

  const steps: EnhancedTrace["steps"] = [
    {
      step: 1,
      line: 1,
      action: "Initialize prev = null and curr = head",
      variables: { prev: "null", curr: "node0", next: "null", reversed: "" },
      note: "Start at the head. prev represents the already reversed part.",
      activeNodes: ["node0"],
      activeEdges: [],
      visitedNodes: [],
    },
  ];

  for (let index = 0; index < values.length; index += 1) {
    const curr = `node${index}`;
    const prev = index > 0 ? `node${index - 1}` : "null";
    const next = index + 1 < values.length ? `node${index + 1}` : "null";
    const reversed = values.slice(0, index + 1).reverse().join(" -> ");

    steps.push({
      step: steps.length + 1,
      line: 1,
      action: `Save next pointer for ${values[index]}`,
      variables: { prev, curr, next, reversed: values.slice(0, index).reverse().join(" -> ") || "empty" },
      note: `next stores where curr originally pointed before rewiring.`,
      activeNodes: [curr, next].filter((node) => node !== "null"),
      activeEdges: next !== "null" ? [`${curr}->${next}`] : [],
      visitedNodes: Array.from({ length: index }, (_, item) => `node${item}`),
    });

    steps.push({
      step: steps.length + 1,
      line: 1,
      action: `Reverse ${values[index]}.next to prev`,
      variables: { prev, curr, next, reversed },
      note: `${values[index]} now points backward into the reversed list.`,
      activeNodes: [curr, prev].filter((node) => node !== "null"),
      activeEdges: prev !== "null" ? [`${curr}->${prev}`] : [],
      visitedNodes: Array.from({ length: index + 1 }, (_, item) => `node${item}`),
    });
  }

  steps.push({
    step: steps.length + 1,
    line: 1,
    action: "Return prev as the new head",
    variables: { prev: `node${values.length - 1}`, curr: "null", next: "null", reversed: values.slice().reverse().join(" -> ") },
    note: "All links are reversed.",
    activeNodes: [`node${values.length - 1}`],
    activeEdges: [],
    visitedNodes: values.map((_, index) => `node${index}`),
  });

  return {
    summary: "Linked list visualization: move prev/curr/next pointers while reversing links.",
    visualType: "linked-list",
    nodes: values.map((value, index) => ({ id: `node${index}`, label: value, group: "list" })),
    edges: values.slice(0, -1).map((_, index) => ({
      from: `node${index}`,
      to: `node${index + 1}`,
      label: "next",
    })),
    steps: steps.slice(0, 18),
    meta: { values },
  };
}

function buildRecursionTrace(stdin: string, functionName = "f"): EnhancedTrace | null {
  const trimmed = stdin.trim();
  const namedN = readNamedNumber(trimmed, "n");
  const isSingleNumber = /^-?\d+$/.test(trimmed);
  const n = namedN ?? (isSingleNumber ? Number(trimmed) : Number.NaN);
  if (!Number.isFinite(n) || n < 0 || n > 6) return null;

  const nodes: EnhancedTrace["nodes"] = [];
  const edges: EnhancedTrace["edges"] = [];
  const steps: EnhancedTrace["steps"] = [];
  const stack: string[] = [];
  let id = 0;
  let finalResult = 0;

  function visit(value: number, parent: string | null, depth: number): number {
    const nodeId = `call${id++}`;
    nodes.push({ id: nodeId, label: `${functionName}(${value})`, group: String(depth) });
    if (parent) edges.push({ from: parent, to: nodeId, label: "calls" });

    stack.push(`${functionName}(${value})`);
    steps.push({
      step: steps.length + 1,
      line: 1,
      action: `Call ${functionName}(${value})`,
      variables: { n: value, stack: stack.join(" -> ") },
      note: value <= 1 ? "Base case reached." : "Recursive call expands into smaller subproblems.",
      activeNodes: [nodeId],
      activeEdges: parent ? [`${parent}->${nodeId}`] : [],
      visitedNodes: [],
    });

    let result = value;
    if (value > 1) {
      const left = visit(value - 1, nodeId, depth + 1);
      const right = visit(value - 2, nodeId, depth + 1);
      result = left + right;
    }

    steps.push({
      step: steps.length + 1,
      line: 1,
      action: `Return ${result} from ${functionName}(${value})`,
      variables: { n: value, returnValue: result, stack: stack.join(" -> ") },
      note: "Pop the current call from the recursion stack.",
      activeNodes: [nodeId],
      activeEdges: [],
      visitedNodes: [nodeId],
    });
    stack.pop();
    return result;
  }

  finalResult = visit(n, null, 0);
  steps.push({
    step: steps.length + 1,
    line: 1,
    action: `Final output is ${finalResult}`,
    variables: { output: finalResult, stack: "" },
    output: String(finalResult),
    note: `The top-level call ${functionName}(${n}) returns ${finalResult}.`,
    activeNodes: ["call0"],
    activeEdges: [],
    visitedNodes: nodes.map((node) => node.id),
  });

  return {
    summary: "Recursion visualization: expand the call tree while showing the active call stack.",
    visualType: "recursion",
    nodes,
    edges,
    steps: steps.map((step, index) => ({ ...step, step: index + 1 })),
    meta: { result: String(finalResult) },
  };
}

function parseLinkedListValues(stdin: string) {
  const raw = stdin.match(/head\s*=\s*\[([^\]]+)\]/i);
  if (raw) {
    return raw[1].split(",").map((item) => item.trim()).filter(Boolean);
  }

  const lines = normalizeInputForVisualizer(stdin).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines[0] !== "list" || lines.length < 3) return [];
  const count = Number(lines[1]);
  const values = lines[2].split(/\s+/).filter(Boolean);
  return Number.isInteger(count) ? values.slice(0, count) : values;
}

function buildArrayHashLookupTrace(stdin: string): EnhancedTrace | null {
  const parsed = parseArrayWithTarget(stdin);
  if (!parsed) return null;

  const seen = new Map<number, number>();
  const steps: EnhancedTrace["steps"] = [];
  let found: [number, number] | null = null;

  parsed.values.forEach((value, index) => {
    if (found) return;

    const need = parsed.target - value;
    const activeNode = `a${index}`;
    steps.push({
      step: steps.length + 1,
      line: 1,
      action: `Check nums[${index}] = ${value}`,
      variables: {
        i: index,
        value,
        need,
        target: parsed.target,
        seen: formatSeen(seen),
      },
      note: `Need ${need} to form target ${parsed.target}.`,
      activeNodes: [activeNode],
      activeEdges: [],
      visitedNodes: Array.from({ length: index }, (_, item) => `a${item}`),
    });

    const matchIndex = seen.get(need);
    if (matchIndex != null) {
      found = [matchIndex, index];
      steps.push({
        step: steps.length + 1,
        line: 1,
        action: `Found pair: nums[${matchIndex}] + nums[${index}] = ${parsed.target}`,
        variables: {
          answer: `[${matchIndex}, ${index}]`,
          seen: formatSeen(seen),
        },
        note: `${need} was already in the hash map, so the answer is ready.`,
        activeNodes: [`a${matchIndex}`, activeNode],
        activeEdges: [],
        visitedNodes: Array.from({ length: index + 1 }, (_, item) => `a${item}`),
      });
      return;
    }

    seen.set(value, index);
    steps.push({
      step: steps.length + 1,
      line: 1,
      action: `Store ${value} -> index ${index}`,
      variables: {
        i: index,
        seen: formatSeen(seen),
      },
      note: "No pair yet, so store the current value for future checks.",
      activeNodes: [activeNode],
      activeEdges: [],
      visitedNodes: Array.from({ length: index + 1 }, (_, item) => `a${item}`),
    });
  });

  return {
    summary: "Array hash-map visualization: scan the array while maintaining a map of previously seen values.",
    visualType: "array",
    nodes: parsed.values.map((value, index) => ({
      id: `a${index}`,
      label: String(value),
      group: "nums",
    })),
    edges: [],
    steps,
    meta: {
      result: found ? `[${found[0]}, ${found[1]}]` : "not found",
    },
  };
}

function buildMergeSortTrace(stdin: string): EnhancedTrace | null {
  const parsed = parseArrayInput(stdin);
  if (!parsed.length) return null;

  const current = [...parsed];
  const steps: EnhancedTrace["steps"] = [
    makeArrayStateStep(1, "Start with input array", current, [], [], "Initial unsorted array."),
  ];

  const merge = (left: number, middle: number, right: number) => {
    const leftPart = current.slice(left, middle + 1);
    const rightPart = current.slice(middle + 1, right + 1);
    let i = 0;
    let j = 0;
    let k = left;

    steps.push(
      makeArrayStateStep(
        steps.length + 1,
        `Merge range [${left}, ${right}]`,
        current,
        rangeIds(left, right),
        [],
        `Left: [${leftPart.join(", ")}], right: [${rightPart.join(", ")}].`,
      ),
    );

    while (i < leftPart.length && j < rightPart.length) {
      current[k] = leftPart[i] <= rightPart[j] ? leftPart[i++] : rightPart[j++];
      k += 1;
    }

    while (i < leftPart.length) {
      current[k] = leftPart[i];
      i += 1;
      k += 1;
    }

    while (j < rightPart.length) {
      current[k] = rightPart[j];
      j += 1;
      k += 1;
    }

    steps.push(
      makeArrayStateStep(
        steps.length + 1,
        `After merge [${left}, ${right}]`,
        current,
        rangeIds(left, right),
        rangeIds(left, right),
        `Updated range becomes [${current.slice(left, right + 1).join(", ")}].`,
      ),
    );
  };

  const sort = (left: number, right: number) => {
    if (left >= right || steps.length >= 12) return;
    const middle = Math.floor((left + right) / 2);

    sort(left, middle);
    sort(middle + 1, right);
    if (steps.length < 12) {
      merge(left, middle, right);
    }
  };

  sort(0, current.length - 1);

  return {
    summary: "Merge sort visualization: recursively split the array and update each merged range.",
    visualType: "array",
    nodes: parsed.map((value, index) => ({
      id: `a${index}`,
      label: String(value),
      group: "array",
    })),
    edges: [],
    steps: steps.slice(0, 12),
    meta: {
      result: `[${current.join(", ")}]`,
    },
  };
}

function makeArrayStateStep(
  step: number,
  action: string,
  values: number[],
  activeNodes: string[],
  visitedNodes: string[],
  note: string,
) {
  return {
    step,
    line: 1,
    action,
    variables: {
      arrayState: values.join(" "),
    },
    note,
    activeNodes,
    activeEdges: [],
    visitedNodes,
  };
}

function rangeIds(left: number, right: number) {
  return Array.from({ length: right - left + 1 }, (_, index) => `a${left + index}`);
}

function parseArrayWithTarget(stdin: string) {
  const rawArray = stdin.match(/(?:arr|nums|array|input)\s*=\s*\[([^\]]+)\]/i);
  const normalized = normalizeInputForVisualizer(stdin);
  const lines = normalized.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const targetFromRaw = readNamedNumber(stdin, "target");
  const targetFromNormalized = lines.length >= 3 ? Number(lines[2]) : null;

  if (rawArray) {
    const values = rawArray[1]
      .split(",")
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isFinite(item));
    const target = targetFromRaw ?? targetFromNormalized;
    return values.length && target != null && Number.isFinite(target)
      ? { values, target }
      : null;
  }

  if (lines.length >= 3) {
    const count = Number(lines[0]);
    const values = lines[1].match(/-?\d+/g)?.map(Number) ?? [];
    const target = Number(lines[2]);
    if (Number.isInteger(count) && values.length === count && Number.isFinite(target)) {
      return { values, target };
    }
  }

  return null;
}

function parseArrayInput(stdin: string) {
  const rawArray = stdin.match(/(?:arr|nums|array|input)\s*=\s*\[([^\]]+)\]/i);
  if (rawArray) {
    return rawArray[1]
      .split(",")
      .map((item) => Number(item.trim()))
      .filter((value) => Number.isFinite(value));
  }

  const normalized = normalizeInputForVisualizer(stdin);
  const lines = normalized.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length >= 2) {
    const count = Number(lines[0]);
    const values = lines[1].match(/-?\d+/g)?.map(Number) ?? [];
    return Number.isInteger(count) ? values.slice(0, count) : values;
  }

  return [];
}

function formatSeen(seen: Map<number, number>) {
  const entries = [...seen.entries()].map(([value, index]) => `${value}:${index}`);
  return entries.length ? `{${entries.join(", ")}}` : "{}";
}

function readNamedNumber(input: string, name: string) {
  const match = input.match(new RegExp(`\\b${name}\\s*=\\s*(-?\\d+)`, "i"));
  return match ? Number(match[1]) : null;
}

function parseDictionaryInput(stdin: string) {
  const lines = stdin.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return null;

  const header = lines[0].match(/\d+/g)?.map(Number);
  if (!header || header.length < 2) return null;
  const [n, k] = header;
  const words = lines.slice(1, 1 + n).map((word) => word.replace(/^"|"$/g, ""));
  if (words.length < n || !words.every((word) => /^[a-z]+$/i.test(word))) return null;

  return { n, k, words };
}

function buildDictionaryToposortTrace(stdin: string): EnhancedTrace | null {
  const parsed = parseDictionaryInput(stdin);
  if (!parsed) return null;
  const { k, words } = parsed;

  const chars = Array.from({ length: k }, (_, index) => String.fromCharCode(97 + index));
  const edgeSet = new Set<string>();
  const edges: Array<{ from: string; to: string; label?: string }> = [];
  const steps: EnhancedTrace["steps"] = [];
  const indegree = Object.fromEntries(chars.map((char) => [char, 0])) as Record<string, number>;

  for (let index = 0; index < words.length - 1; index += 1) {
    const first = words[index];
    const second = words[index + 1];
    const diff = firstDifference(first, second);
    steps.push({
      step: steps.length + 1,
      line: index + 1,
      action: `Compare "${first}" and "${second}"`,
      variables: { wordA: first, wordB: second },
      note: diff
        ? `First mismatch is ${diff.from} vs ${diff.to}, so ${diff.from} must come before ${diff.to}.`
        : "No ordering edge is created from this pair.",
      activeNodes: diff ? [diff.from, diff.to] : [],
      activeEdges: [],
      visitedNodes: [],
    });

    if (!diff) continue;
    const key = `${diff.from}->${diff.to}`;
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      edges.push({ from: diff.from, to: diff.to, label: `${diff.from}<${diff.to}` });
      indegree[diff.to] += 1;
      steps.push({
        step: steps.length + 1,
        line: index + 1,
        action: `Add directed edge ${diff.from} -> ${diff.to}`,
        variables: withIndegree({ edge: key }, indegree),
        note: `This edge means character "${diff.from}" must appear before "${diff.to}".`,
        activeNodes: [diff.from, diff.to],
        activeEdges: [key],
        visitedNodes: [],
      });
    }
  }

  const adjacency = new Map(chars.map((char) => [char, [] as string[]]));
  edges.forEach((edge) => adjacency.get(edge.from)?.push(edge.to));
  const mutableIndegree = { ...indegree };
  const queue = chars.filter((char) => mutableIndegree[char] === 0);
  const result: string[] = [];

  steps.push({
    step: steps.length + 1,
    line: 1,
    action: "Initialize topological queue",
    variables: withIndegree({ queue: queue.join(" "), result: "" }, mutableIndegree),
    note: "All characters with indegree 0 are ready to be placed in the alien order.",
    activeNodes: queue,
    activeEdges: [],
    visitedNodes: [],
  });

  while (queue.length && steps.length < 16) {
    const node = queue.shift()!;
    result.push(node);
    steps.push({
      step: steps.length + 1,
      line: 1,
      action: `Pop ${node} from queue and append to result`,
      variables: withIndegree({ queue: queue.join(" "), result: result.join("") }, mutableIndegree),
      note: `Current alien order prefix is "${result.join("")}".`,
      activeNodes: [node],
      activeEdges: [],
      visitedNodes: [...result],
    });

    for (const next of adjacency.get(node) ?? []) {
      mutableIndegree[next] -= 1;
      if (mutableIndegree[next] === 0) queue.push(next);
      steps.push({
        step: steps.length + 1,
        line: 1,
        action: `Relax edge ${node} -> ${next}`,
        variables: withIndegree({ queue: queue.join(" "), result: result.join("") }, mutableIndegree),
        note:
          mutableIndegree[next] === 0
            ? `${next} now has indegree 0, so it enters the queue.`
            : `${next} still has incoming dependencies.`,
        activeNodes: [node, next],
        activeEdges: [`${node}->${next}`],
        visitedNodes: [...result],
      });
    }
  }

  return {
    summary: "Alien Dictionary visualization: build character dependencies, then run topological sort.",
    visualType: "toposort",
    nodes: chars.map((char) => ({ id: char, label: char, group: "letter" })),
    edges,
    steps: steps.map((step, index) => ({ ...step, step: index + 1 })).slice(0, 16),
    meta: {
      words,
      order: result.join(""),
      indegree,
      queue,
      result: result.join(""),
    },
  };
}

function firstDifference(first: string, second: string) {
  const length = Math.min(first.length, second.length);
  for (let index = 0; index < length; index += 1) {
    if (first[index] !== second[index]) {
      return { from: first[index].toLowerCase(), to: second[index].toLowerCase() };
    }
  }

  return null;
}

function withIndegree(
  variables: Record<string, string | number | boolean>,
  indegree: Record<string, number>,
) {
  return {
    ...variables,
    ...Object.fromEntries(Object.entries(indegree).map(([key, value]) => [`in_${key}`, value])),
  };
}

function parseEdgeList(stdin: string) {
  const lines = stdin.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const header = lines[0]?.match(/-?\d+/g)?.map(Number) ?? [];
  if (header.length < 2) return null;

  const [n, m, source] = header;
  if (!Number.isInteger(n) || !Number.isInteger(m) || n <= 0 || m <= 0) return null;

  const rawEdges: Array<[number, number, number?]> = [];
  for (const line of lines.slice(1, 1 + m)) {
    const values = line.match(/-?\d+/g)?.map(Number) ?? [];
    if (values.length < 2) continue;

    const [from, to, weight] = values;
    const zeroBased = from >= 0 && from < n && to >= 0 && to < n;
    const oneBased = from >= 1 && from <= n && to >= 1 && to <= n;

    if (zeroBased || oneBased) {
      rawEdges.push([from, to, weight]);
    }
  }

  const usesZeroBased = rawEdges.some(([from, to]) => from === 0 || to === 0);
  return rawEdges.length ? { n, edges: rawEdges, base: usesZeroBased ? 0 : 1, source } : null;
}

function extractEdgeFromText(text: string): [number, number] | null {
  const match = text.match(/\(?\s*(\d+)\s*,\s*(\d+)\s*\)?/);
  if (!match) return null;

  return [Number(match[1]), Number(match[2])];
}

function extractVerticesFromText(text: string, nodeIds: string[]) {
  const nodeIdSet = new Set(nodeIds);
  const match = text.match(/\b(?:vertex|vertices|node|nodes)\s+([A-Za-z0-9_,\sand-]+)/i);
  if (!match) return [];

  return [...new Set(match[1].match(/[A-Za-z0-9_]+/g) ?? [])]
    .filter((token) => nodeIdSet.has(token));
}

function TopoStatePanel({
  trace,
  currentStep,
}: {
  trace: EnhancedTrace;
  currentStep: EnhancedTrace["steps"][number] | null;
}) {
  const variables = currentStep?.variables ?? {};
  const queue = String(variables.queue ?? trace.meta?.queue?.join(" ") ?? "")
    .split(/\s+/)
    .filter(Boolean);
  const result = String(variables.result ?? trace.meta?.result ?? "");
  const indegrees = trace.nodes.map((node) => ({
    id: node.id,
    value: Number(variables[`in_${node.id}`] ?? trace.meta?.indegree?.[node.id] ?? 0),
  }));

  return (
    <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_1.4fr]">
      <div className="rounded-md border border-white/[0.08] bg-white/[0.035] p-3">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Queue</p>
        <div className="flex min-h-9 flex-wrap gap-2">
          {queue.length ? queue.map((item) => (
            <span key={`${item}-queue`} className="rounded-md bg-signal-blue/15 px-3 py-1.5 text-sm font-bold text-signal-blue">
              {item}
            </span>
          )) : <span className="text-sm text-zinc-600">empty</span>}
        </div>
      </div>
      <div className="rounded-md border border-white/[0.08] bg-white/[0.035] p-3">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Result</p>
        <p className="min-h-9 font-mono text-2xl font-bold text-signal-green">
          {result || "_"}
        </p>
      </div>
      <div className="rounded-md border border-white/[0.08] bg-white/[0.035] p-3">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
          Indegree
        </p>
        <div className="flex flex-wrap gap-2">
          {indegrees.map((item) => (
            <span key={item.id} className="rounded-md border border-white/[0.08] bg-black/35 px-2.5 py-1 text-sm text-zinc-300">
              {item.id}: <strong className={item.value === 0 ? "text-signal-green" : "text-signal-yellow"}>{item.value}</strong>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ArrayVisualizer({
  trace,
  highlight,
}: {
  trace: EnhancedTrace;
  highlight: ReturnType<typeof buildHighlight>;
}) {
  const stateValues = String(highlight.currentVariables.arrayState ?? "")
    .split(/\s+/)
    .filter(Boolean);
  const cells = trace.nodes.map((node, index) => ({
    ...node,
    label: stateValues[index] ?? node.label,
  }));

  return (
    <div className="grid min-h-[420px] place-items-center rounded-md bg-[#121212] p-6">
      <div className="flex max-w-full flex-wrap items-end justify-center gap-3">
        {cells.map((node, index) => {
          const active = highlight.activeNodes.has(node.id);
          const visited = highlight.visitedNodes.has(node.id);
          return (
            <div key={node.id} className="text-center">
              <div
                className={`grid h-16 min-w-16 place-items-center rounded-md border px-4 font-mono text-lg font-bold transition ${
                  active
                    ? "scale-110 border-signal-yellow bg-signal-yellow text-black"
                    : visited
                      ? "border-signal-green bg-signal-green/15 text-signal-green"
                      : "border-white/[0.1] bg-black/40 text-zinc-200"
                }`}
              >
                {node.label}
              </div>
              <p className="mt-2 text-xs text-zinc-600">{index}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GridVisualizer({
  trace,
  highlight,
}: {
  trace: EnhancedTrace;
  highlight: ReturnType<typeof buildHighlight>;
}) {
  const size = Math.ceil(Math.sqrt(Math.max(trace.nodes.length, 1)));
  const cells = trace.nodes;

  return (
    <div className="grid min-h-[420px] place-items-center rounded-md bg-[#121212] p-6">
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(44px, 64px))` }}
      >
        {cells.map((node) => {
          const active = highlight.activeNodes.has(node.id);
          const visited = highlight.visitedNodes.has(node.id);
          return (
            <div
              key={node.id}
              className={`grid aspect-square place-items-center rounded-md border font-mono text-sm font-bold transition ${
                active
                  ? "scale-110 border-signal-yellow bg-signal-yellow text-black"
                  : visited
                    ? "border-signal-green bg-signal-green/15 text-signal-green"
                    : "border-white/[0.1] bg-black/40 text-zinc-300"
              }`}
            >
              {node.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LinkedListVisualizer({
  trace,
  currentStep,
}: {
  trace: EnhancedTrace;
  currentStep: EnhancedTrace["steps"][number] | null;
}) {
  const values = trace.nodes;
  const variables = currentStep?.variables ?? {};
  const active = new Set(currentStep?.activeNodes ?? []);
  const activeEdges = new Set(currentStep?.activeEdges ?? []);
  const visited = new Set(currentStep?.visitedNodes ?? []);

  return (
    <div className="min-h-[420px] rounded-md bg-[#121212] p-6">
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {["prev", "curr", "next"].map((name) => (
          <div key={name} className="rounded-md border border-white/[0.08] bg-black/35 p-3">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">{name}</p>
            <p className="mt-2 font-mono text-lg font-bold text-signal-blue">
              {String(variables[name] ?? "null").replace("node", "#")}
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex min-w-max items-center justify-center gap-4">
          {values.map((node, index) => {
            const isActive = active.has(node.id);
            const isVisited = visited.has(node.id);
            const next = values[index + 1];
            const reversedEdge = activeEdges.has(`${node.id}->node${index - 1}`);

            return (
              <div key={node.id} className="flex items-center gap-4">
                <div className="relative">
                  <div
                    className={`grid h-20 w-24 place-items-center rounded-lg border text-xl font-bold transition ${
                      isActive
                        ? "scale-110 border-signal-yellow bg-signal-yellow text-black"
                        : isVisited
                          ? "border-signal-green bg-signal-green/15 text-signal-green"
                          : "border-white/[0.12] bg-black/50 text-white"
                    }`}
                  >
                    {node.label}
                  </div>
                  <div className="mt-2 text-center text-xs text-zinc-600">{node.id.replace("node", "#")}</div>
                </div>
                {next ? (
                  <div className={`text-3xl transition ${reversedEdge ? "rotate-180 text-signal-yellow" : "text-zinc-600"}`}>
                    →
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 rounded-md border border-signal-green/20 bg-signal-green/10 p-3">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-signal-green">Reversed prefix</p>
        <p className="mt-2 font-mono text-lg text-white">{String(variables.reversed ?? "empty")}</p>
      </div>
    </div>
  );
}

function RecursionVisualizer({
  trace,
  currentStep,
  highlight,
}: {
  trace: EnhancedTrace;
  currentStep: EnhancedTrace["steps"][number] | null;
  highlight: ReturnType<typeof buildHighlight>;
}) {
  const layout = buildRecursionLayout(trace);
  const stack = String(currentStep?.variables?.stack ?? "")
    .split("->")
    .map((item) => item.trim())
    .filter(Boolean);

  return (
    <div className="grid min-h-[520px] gap-4 rounded-md bg-[#121212] p-4 xl:grid-cols-[1fr_260px]">
      <svg viewBox="0 0 920 520" className="h-[520px] w-full">
        <defs>
          <marker id="recArrow" markerHeight="8" markerWidth="8" orient="auto" refX="8" refY="4">
            <path d="M0,0 L8,4 L0,8 Z" fill="#52525b" />
          </marker>
        </defs>
        {trace.edges.map((edge) => {
          const from = layout.get(edge.from);
          const to = layout.get(edge.to);
          if (!from || !to) return null;
          const active = highlight.activeEdges.has(`${edge.from}->${edge.to}`);
          return (
            <line
              key={`${edge.from}-${edge.to}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={active ? "#facc15" : "#52525b"}
              strokeWidth={active ? 4 : 2}
              markerEnd="url(#recArrow)"
            />
          );
        })}
        {trace.nodes.map((node) => {
          const point = layout.get(node.id);
          if (!point) return null;
          const active = highlight.activeNodes.has(node.id);
          const visited = highlight.visitedNodes.has(node.id);
          return (
            <g key={node.id}>
              <rect
                x={point.x - 44}
                y={point.y - 20}
                width="88"
                height="40"
                rx="10"
                fill={active ? "#facc15" : visited ? "#14532d" : "#18181b"}
                stroke={active ? "#fde68a" : visited ? "#22c55e" : "#4ea1ff"}
                strokeWidth={active ? 4 : 2}
              />
              <text
                x={point.x}
                y={point.y + 5}
                textAnchor="middle"
                fontSize="13"
                fontWeight="700"
                fill={active ? "#050505" : "#f4f4f5"}
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="rounded-md border border-white/[0.08] bg-black/35 p-4">
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
          Recursive Stack
        </p>
        <div className="flex min-h-[420px] flex-col-reverse justify-start gap-2">
          {stack.length ? stack.map((call, index) => (
            <div
              key={`${call}-${index}`}
              className="rounded-md border border-signal-blue/25 bg-signal-blue/10 px-3 py-2 font-mono text-sm font-bold text-signal-blue"
            >
              {call}
            </div>
          )) : (
            <p className="text-sm text-zinc-600">stack empty</p>
          )}
        </div>
        <div className="mt-4 rounded-md border border-signal-green/25 bg-signal-green/10 p-3">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-signal-green">
            Output
          </p>
          <p className="mt-2 font-mono text-3xl font-bold text-white">
            {String(currentStep?.output ?? currentStep?.variables?.output ?? trace.meta?.result ?? "_")}
          </p>
        </div>
      </div>
    </div>
  );
}

function buildRecursionLayout(trace: EnhancedTrace) {
  const layout = new Map<string, { x: number; y: number }>();
  const levels = new Map<number, string[]>();
  trace.nodes.forEach((node) => {
    const level = Number(node.group ?? 0);
    levels.set(level, [...(levels.get(level) ?? []), node.id]);
  });

  const maxLevel = Math.max(...levels.keys(), 0);
  const yGap = 420 / Math.max(maxLevel, 1);

  [...levels.entries()].forEach(([level, nodes]) => {
    const gap = 760 / Math.max(nodes.length - 1, 1);
    nodes.forEach((node, index) => {
      layout.set(node, {
        x: 80 + (nodes.length === 1 ? 380 : index * gap),
        y: 50 + level * yGap,
      });
    });
  });

  return layout;
}

function buildHighlight(trace: EnhancedTrace | null, frame: number) {
  const activeNodes = new Set<string>();
  const activeEdges = new Set<string>();
  const visitedNodes = new Set<string>();
  const currentVariables: Record<string, string | number | boolean> = {};

  if (!trace) {
    return { activeNodes, activeEdges, visitedNodes, currentVariables };
  }

  for (let index = 0; index <= frame; index += 1) {
    const step = trace.steps[index];
    step?.visitedNodes?.forEach((node) => visitedNodes.add(String(node)));
    inferNodesFromStep(trace, step?.variables).forEach((node) => visitedNodes.add(node));
  }

  const current = trace.steps[frame];
  Object.assign(currentVariables, current?.variables ?? {});
  current?.activeNodes?.forEach((node) => activeNodes.add(String(node)));
  current?.activeEdges?.forEach((edge) => activeEdges.add(String(edge)));
  inferNodesFromStep(trace, current?.variables).forEach((node) => activeNodes.add(node));

  if (!activeNodes.size && trace.nodes[frame]) {
    activeNodes.add(trace.nodes[frame].id);
  }

  return { activeNodes, activeEdges, visitedNodes, currentVariables };
}

function inferNodesFromStep(
  trace: EnhancedTrace,
  variables: Record<string, string | number | boolean> | undefined,
) {
  if (!variables) return [];

  const nodeIds = new Set(trace.nodes.map((node) => node.id));
  const matches = new Set<string>();
  Object.values(variables).forEach((value) => {
    const tokens = String(value).match(/[A-Za-z0-9_]+/g) ?? [];
    tokens.forEach((token) => {
      if (nodeIds.has(token)) {
        matches.add(token);
      }
    });
  });

  return [...matches];
}
