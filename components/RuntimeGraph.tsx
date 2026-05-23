"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  Label,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type RuntimeGraphProps = {
  complexity?: string;
};

const inputs = [1, 5, 10, 20, 35, 50, 75, 100];

export default function RuntimeGraph({ complexity = "O(n log n)" }: RuntimeGraphProps) {
  const shape = classifyComplexity(complexity);
  const runtimeData = buildRuntimeData();

  return (
    <div className="h-[360px] rounded-md border border-white/[0.08] bg-[#111] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-400">
            Complexity Curve
          </h3>
          <p className="mt-1 text-xs text-zinc-500">
            Common Big-O growth curves across 0-100 elements
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${shape.badgeClass}`}>
          highlights {shape.display}
        </span>
      </div>
      <ResponsiveContainer width="100%" height="82%">
        <LineChart data={runtimeData} margin={{ left: 12, right: 18, top: 8, bottom: 22 }}>
          <CartesianGrid stroke="#262626" strokeDasharray="3 3" />
          <XAxis dataKey="n" tick={{ fill: "#8a8a8a", fontSize: 12 }}>
            <Label value="Elements" offset={-14} position="insideBottom" fill="#a1a1aa" />
          </XAxis>
          <YAxis tick={{ fill: "#8a8a8a", fontSize: 12 }} domain={[0, 1000]}>
            <Label
              value="Operations"
              angle={-90}
              position="insideLeft"
              fill="#a1a1aa"
              style={{ textAnchor: "middle" }}
            />
          </YAxis>
          <Tooltip
            formatter={(value, name) => [Math.round(Number(value)), String(name)]}
            contentStyle={{
              background: "#0a0a0b",
              border: "1px solid rgba(255,255,255,.12)",
              borderRadius: 6,
              color: "#fff",
            }}
          />
          {complexityLines.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.label}
              stroke={line.color}
              strokeWidth={shape.key === line.key ? 4 : 1.7}
              strokeOpacity={shape.key === line.key ? 1 : 0.42}
              dot={false}
              activeDot={shape.key === line.key ? { r: 6, stroke: "#fff", strokeWidth: 2 } : false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-2 text-xs text-zinc-500">
        {complexityLines.map((line) => (
          <span key={line.key} className={shape.key === line.key ? "font-bold text-white" : ""}>
            <span className="mr-1 inline-block h-2 w-5 rounded-full" style={{ background: line.color }} />
            {line.label}
          </span>
        ))}
      </div>
    </div>
  );
}

const complexityLines = [
  { key: "constant", label: "O(1)", color: "#22c55e" },
  { key: "log", label: "O(log n)", color: "#14b8a6" },
  { key: "linear", label: "O(n)", color: "#4ea1ff" },
  { key: "nlogn", label: "O(n log n)", color: "#ec4899" },
  { key: "quadratic", label: "O(n^2)", color: "#84cc16" },
  { key: "exponential", label: "O(2^n)", color: "#f97316" },
  { key: "factorial", label: "O(n!)", color: "#facc15" },
] as const;

function buildRuntimeData() {
  return inputs.map((input, index) => ({
    n: index === 0 ? 0 : input,
    constant: 8,
    log: Math.log2(input + 1) * 14,
    linear: input,
    nlogn: input * Math.log2(input + 1),
    quadratic: Math.min(1000, input * input * 0.9),
    exponential: Math.min(1000, Math.pow(2, input / 5)),
    factorial: Math.min(1000, factorialPreview(input)),
  }));
}

function classifyComplexity(complexity: string) {
  const normalized = complexity.toLowerCase().replace(/\s+/g, "");

  if (normalized.includes("n!")) {
    return {
      key: "factorial",
      display: "O(n!)",
      badgeClass: "bg-yellow-500/10 text-yellow-200",
    };
  }

  if (normalized.includes("2^n") || normalized.includes("exp")) {
    return {
      key: "exponential",
      display: "O(2^n)",
      badgeClass: "bg-red-500/10 text-red-300",
    };
  }

  if (normalized.includes("n^2") || normalized.includes("n*n")) {
    return {
      key: "quadratic",
      display: "O(n^2)",
      badgeClass: "bg-orange-500/10 text-orange-300",
    };
  }

  if (normalized.includes("nlogn") || normalized.includes("n*log") || normalized.includes("nlog")) {
    return {
      key: "nlogn",
      display: "O(n log n)",
      badgeClass: "bg-pink-500/10 text-pink-300",
    };
  }

  if (normalized.includes("logn")) {
    return {
      key: "log",
      display: "O(log n)",
      badgeClass: "bg-green-500/10 text-green-300",
    };
  }

  if (normalized.includes("o(1)") || normalized.includes("constant")) {
    return {
      key: "constant",
      display: "O(1)",
      badgeClass: "bg-teal-500/10 text-teal-300",
    };
  }

  return {
    key: "linear",
    display: "O(n)",
    badgeClass: "bg-signal-blue/10 text-signal-blue",
  };
}

function factorialPreview(input: number) {
  const scaled = Math.max(1, Math.floor(input / 8));
  let value = 1;
  for (let index = 2; index <= scaled; index += 1) {
    value *= index;
  }

  return value * 2;
}
