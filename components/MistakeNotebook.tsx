const warnings = [
  "Off-by-one risk: boundary check uses nx >= n and ny >= m correctly, keep it before indexing.",
  "Int overflow: replace 1e9 sentinel with const int INF for safer comparisons.",
  "Missing visited marking: distance array currently doubles as visited, document the invariant.",
  "Infinite loop risk: queue pop is present, risk is low for the BFS loop.",
  "Hidden test hint: disconnected cells should remain -1 and not be converted to 0.",
];

export default function MistakeNotebook() {
  return (
    <div className="rounded-md border border-white/[0.08] bg-[#111] p-4">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-zinc-400">
        Personalized Error Notebook
      </h3>
      <div className="space-y-2">
        {warnings.map((warning, index) => (
          <div
            key={warning}
            className="rounded-md border border-white/[0.06] bg-white/[0.03] p-3 text-sm leading-6 text-zinc-400"
          >
            <span className="mr-2 font-bold text-signal-yellow">W{index + 1}</span>
            {warning}
          </div>
        ))}
      </div>
    </div>
  );
}
