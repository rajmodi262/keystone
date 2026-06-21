"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/client";

type Severity = "CRITICAL" | "HIGH" | "MODERATE" | "LOW";

const SEV_HEX: Record<Severity, string> = {
  CRITICAL: "#FF3B47",
  HIGH: "#FFB020",
  MODERATE: "#39C2FF",
  LOW: "#8294AD",
};

export interface ConflictView {
  id: string;
  topic: string;
  valueA: string;
  valueB: string;
  status: string;
  severity: Severity;
  governingCode: string | null;
  rationale: string;
  docA: { code: string };
  docB: { code: string };
}

export function ConflictCard({
  conflict: c,
  canEdit = true,
  onSetStatus,
}: {
  conflict: ConflictView;
  canEdit?: boolean;
  onSetStatus: (status: "RESOLVED" | "DISMISSED") => void;
}) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const explain = api.conflicts.explain.useMutation({
    onSuccess: (r) => setExplanation(r.explanation),
  });
  const color = SEV_HEX[c.severity] ?? SEV_HEX.MODERATE;

  return (
    <div
      className="rounded border p-3"
      style={{ borderColor: `${color}55`, background: `${color}0d` }}
    >
      <div className="mono mb-2 flex items-center justify-between text-[11px]">
        <span style={{ color }}>⚠ {c.topic}</span>
        <span
          className="rounded px-1.5 py-0.5 text-[8px] tracking-[0.14em]"
          style={{ color, border: `1px solid ${color}55` }}
        >
          {c.severity}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="mono text-muted">
          <b className="text-chalk">{c.docA.code}</b> · {c.valueA}
        </span>
        <span className="mono text-muted-2">vs</span>
        <span className="mono text-muted">
          <b className="text-chalk">{c.docB.code}</b> ·{" "}
          <span style={{ color }}>{c.valueB}</span>
        </span>
      </div>

      <p className="mono mt-2 text-[10px] leading-relaxed text-muted">
        {c.governingCode ? (
          <>
            ▸ <span className="text-blueprint">{c.governingCode} governs</span> —{" "}
            {c.rationale}
          </>
        ) : (
          <>▸ {c.rationale}</>
        )}
      </p>

      {explanation && (
        <p className="mt-2 rounded border border-line bg-ink/40 p-2 text-[11px] leading-relaxed text-chalk">
          {explanation}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          onClick={() => explain.mutate({ conflictId: c.id })}
          disabled={explain.isPending}
          className="mono rounded border border-line px-2 py-0.5 text-[9px] tracking-[0.14em] text-muted transition-colors hover:border-blueprint hover:text-blueprint disabled:opacity-50"
        >
          {explain.isPending ? "THINKING…" : "EXPLAIN"}
        </button>
        {c.status === "OPEN" && canEdit ? (
          <>
            <button
              onClick={() => onSetStatus("RESOLVED")}
              className="mono rounded border border-line px-2 py-0.5 text-[9px] text-muted transition-colors hover:border-blueprint hover:text-blueprint"
            >
              RESOLVE
            </button>
            <button
              onClick={() => onSetStatus("DISMISSED")}
              className="mono rounded border border-line px-2 py-0.5 text-[9px] text-muted-2 transition-colors hover:text-chalk"
            >
              DISMISS
            </button>
          </>
        ) : (
          <span className="mono text-[9px] text-muted-2">{c.status}</span>
        )}
      </div>
    </div>
  );
}
