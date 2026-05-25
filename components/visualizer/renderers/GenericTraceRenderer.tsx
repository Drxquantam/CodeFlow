"use client";

import type { TraceFrame } from "@/types/trace";

export default function GenericTraceRenderer({ frame }: { frame: TraceFrame }) {
  return (
    <div className="grid gap-3 rounded-md bg-[#101010] p-4 md:grid-cols-2">
      <Panel title="Current Line">
        <p className="font-mono text-sm text-zinc-300">
          {frame.lineNumber ? `Line ${frame.lineNumber}: ` : ""}
          {frame.codeLine ?? "No concrete runtime line captured."}
        </p>
      </Panel>
      <Panel title="Output">
        <pre className="whitespace-pre-wrap font-mono text-sm text-zinc-300">
          {frame.generic?.stdout || frame.generic?.stderr || "_"}
        </pre>
      </Panel>
      <Panel title="Variables">
        <pre className="whitespace-pre-wrap font-mono text-sm text-zinc-300">
          {JSON.stringify(frame.variables ?? frame.generic?.state ?? {}, null, 2)}
        </pre>
      </Panel>
      <Panel title="Changed">
        <p className="text-sm text-zinc-300">
          {frame.generic?.changedVariables?.length ? frame.generic.changedVariables.join(", ") : "No changed variables reported."}
        </p>
      </Panel>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-white/[0.08] bg-black/35 p-3">
      <h4 className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">{title}</h4>
      {children}
    </div>
  );
}
