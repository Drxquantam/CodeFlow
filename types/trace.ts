export type TraceVisualizationType =
  | "graph"
  | "array"
  | "tree"
  | "linked-list"
  | "dp"
  | "recursion"
  | "generic";

export type TraceStrategy =
  | "deterministic"
  | "instrumented-runtime"
  | "trace-hooks"
  | "fallback";

export type TraceFrame = {
  step: number;
  type: TraceVisualizationType;
  operation: string;
  explanation?: string;
  lineNumber?: number;
  codeLine?: string;
  variables?: Record<string, unknown>;

  graph?: {
    nodes: Array<string | number>;
    edges: Array<[string | number, string | number]>;
    visited?: Array<string | number>;
    currentNode?: string | number;
    activeEdge?: [string | number, string | number];
    queue?: Array<string | number>;
    stack?: Array<string | number>;
    target?: string | number;
    found?: boolean;
    directed?: boolean;
  };

  array?: {
    values: Array<number | string>;
    activeIndices?: number[];
    comparingIndices?: number[];
    sortedIndices?: number[];
    swappedIndices?: number[];
    low?: number;
    mid?: number;
    high?: number;
  };

  dp?: {
    table: Array<Array<number | string>>;
    activeCell?: [number, number];
    updatedCells?: Array<[number, number]>;
  };

  recursion?: {
    callStack: string[];
    currentCall?: string;
    returnedFrom?: string;
  };

  tree?: {
    nodes: Array<{
      id: string | number;
      value: string | number;
      left?: string | number;
      right?: string | number;
    }>;
    currentNode?: string | number;
    visited?: Array<string | number>;
  };

  linkedList?: {
    nodes: Array<{
      id: string | number;
      value: string | number;
      next?: string | number | null;
    }>;
    pointers?: Record<string, string | number | null>;
    currentNode?: string | number;
  };

  generic?: {
    stdout?: string;
    stderr?: string;
    state?: Record<string, unknown>;
    changedVariables?: string[];
  };
};

export type TraceResult = {
  success: boolean;
  strategy: TraceStrategy;
  algorithm?: string;
  language?: string;
  frames: TraceFrame[];
  warnings?: string[];
  errors?: string[];
  requiredInput?: string[];
  fallbackMessage?: string;
};

export type AnalyzerResult = {
  language: "cpp" | "java" | "python" | "javascript" | "typescript" | "unknown";
  algorithm?: string;
  dataStructure?: string;
  confidence: number;
  strategy: TraceStrategy;
  extractedInput?: unknown;
  warnings?: string[];
  requiredInput?: string[];
};
