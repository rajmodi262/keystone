"use client";

import { useEffect, useMemo, useState } from "react";

type Node = {
  id: string;
  code: string;
  title: string;
  discipline: string;
  revision: string;
};
type Edge = { fromDocId: string; toDocId: string | null };

const COLUMN: Record<string, number> = {
  SPEC: 0,
  STRUCT: 1,
  CIVIL: 1,
  ARCH: 2,
  MECH: 2,
  ELEC: 2,
  RFI: 3,
  OTHER: 2,
};
const DRAWING_DISC = ["STRUCT", "ARCH", "MECH", "ELEC", "CIVIL"];
const COLS_X = [150, 420, 690, 905];
const W = 1000;
const H = 560;

export function ImpactGraph({
  nodes,
  edges,
  conflictDocIds,
}: {
  nodes: Node[];
  edges: Edge[];
  conflictDocIds: Set<string>;
}) {
  // deterministic layered layout: specs -> structural -> arch/mech -> rfis
  const pos = useMemo(() => {
    const groups: Record<number, Node[]> = {};
    for (const n of nodes) {
      const c = COLUMN[n.discipline] ?? 2;
      (groups[c] = groups[c] ?? []).push(n);
    }
    const map = new Map<string, { x: number; y: number }>();
    for (const cStr of Object.keys(groups)) {
      const c = Number(cStr);
      const list = groups[c];
      list.forEach((n, i) => {
        const y = ((i + 1) / (list.length + 1)) * H;
        map.set(n.id, { x: COLS_X[c] ?? 500, y });
      });
    }
    return map;
  }, [nodes]);

  // reverse adjacency: who references X  (blast travels X -> referrers)
  const revAdj = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const e of edges) {
      if (!e.toDocId) continue;
      (m.get(e.toDocId) ?? m.set(e.toDocId, []).get(e.toDocId)!).push(e.fromDocId);
    }
    return m;
  }, [edges]);

  // most-referenced node = best demo epicentre
  const epicentre = useMemo(() => {
    let best: string | null = null;
    let max = -1;
    for (const [id, refs] of Array.from(revAdj.entries())) {
      if (refs.length > max) {
        max = refs.length;
        best = id;
      }
    }
    return best;
  }, [revAdj]);

  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(0);

  const depths = useMemo(() => {
    const d = new Map<string, number>();
    if (!selected) return d;
    d.set(selected, 0);
    let layer = [selected];
    let depth = 0;
    while (layer.length) {
      const next: string[] = [];
      for (const p of layer)
        for (const r of revAdj.get(p) ?? [])
          if (!d.has(r)) {
            d.set(r, depth + 1);
            next.push(r);
          }
      layer = next;
      depth++;
    }
    return d;
  }, [selected, revAdj]);

  const maxDepth = useMemo(
    () => Math.max(0, ...Array.from(depths.values())),
    [depths],
  );

  useEffect(() => {
    if (!selected) return;
    setRevealed(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let d = 0; d <= maxDepth; d++) {
      timers.push(setTimeout(() => setRevealed(d), d * 480));
    }
    return () => timers.forEach(clearTimeout);
  }, [selected, maxDepth]);

  useEffect(() => {
    if (epicentre) setSelected(epicentre);
  }, [epicentre]);

  const nodeById = useMemo(
    () => new Map(nodes.map((n) => [n.id, n])),
    [nodes],
  );

  const affectedShown = Array.from(depths.entries()).filter(
    ([, d]) => d > 0 && d <= revealed,
  );
  const counts = {
    drawings: affectedShown.filter(([id]) =>
      DRAWING_DISC.includes(nodeById.get(id)?.discipline ?? ""),
    ).length,
    rfis: affectedShown.filter(([id]) => nodeById.get(id)?.discipline === "RFI")
      .length,
    conflicts: affectedShown.filter(([id]) => conflictDocIds.has(id)).length,
  };

  const kind = (id: string): "source" | "conflict" | "stale" | "idle" => {
    const d = depths.get(id);
    if (d === undefined || d > revealed) return "idle";
    if (d === 0) return "source";
    return conflictDocIds.has(id) ? "conflict" : "stale";
  };
  const stroke: Record<string, string> = {
    idle: "#2C3A4E",
    source: "#ffffff",
    stale: "var(--hazard)",
    conflict: "var(--danger)",
  };
  const glow: Record<string, string> = {
    idle: "none",
    source: "drop-shadow(0 0 16px rgba(255,255,255,.45))",
    stale: "drop-shadow(0 0 12px rgba(255,176,32,.5))",
    conflict: "drop-shadow(0 0 16px rgba(255,59,71,.6))",
  };

  return (
    <div className="relative overflow-hidden rounded border border-line bg-graphite/40">
      <div className="lt-grid opacity-60" />

      <div className="relative z-10 flex items-center justify-between px-5 pt-4">
        <div className="mono text-[10px] tracking-[0.24em] text-muted-2">
          IMPACT GRAPH — BLAST RADIUS
        </div>
        <div className="mono flex gap-5 text-[10px] tracking-[0.18em]">
          <span className="text-hazard">
            {counts.drawings} <span className="text-muted-2">DRAWINGS</span>
          </span>
          <span className="text-hazard">
            {counts.rfis} <span className="text-muted-2">RFIs</span>
          </span>
          <span className="text-danger">
            {counts.conflicts} <span className="text-muted-2">CONFLICTS</span>
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="relative z-10 w-full"
        style={{ height: "clamp(320px, 52vh, 520px)" }}
        preserveAspectRatio="xMidYMid meet"
      >
        {edges.map((e, i) => {
          if (!e.toDocId) return null;
          const a = pos.get(e.fromDocId);
          const b = pos.get(e.toDocId);
          if (!a || !b) return null;
          const da = depths.get(e.fromDocId);
          const db = depths.get(e.toDocId);
          const active =
            da !== undefined &&
            db !== undefined &&
            Math.max(da, db) <= revealed;
          return (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={active ? "var(--hazard)" : "var(--blueprint-dim)"}
              strokeWidth={active ? 1.4 : 0.8}
              opacity={active ? 0.7 : 0.28}
              style={{ transition: "all .4s var(--ease)" }}
            />
          );
        })}

        {nodes.map((n) => {
          const p = pos.get(n.id);
          if (!p) return null;
          const k = kind(n.id);
          return (
            <g
              key={n.id}
              transform={`translate(${p.x - 56},${p.y - 26})`}
              onClick={() => setSelected(n.id)}
              style={{ cursor: "pointer" }}
            >
              <rect
                width="112"
                height="52"
                rx="3"
                fill="rgba(12,17,26,.96)"
                stroke={stroke[k]}
                strokeWidth={k === "conflict" ? 1.6 : 1}
                style={{ filter: glow[k], transition: "all .4s var(--ease)" }}
              />
              <text
                x="12"
                y="20"
                className="mono"
                fontSize="9"
                letterSpacing="1.5"
                fill={k === "idle" ? "var(--muted-2)" : "var(--muted)"}
              >
                {n.discipline}
              </text>
              <text
                x="100"
                y="20"
                textAnchor="end"
                className="mono"
                fontSize="8"
                fill="var(--blueprint)"
              >
                {n.revision}
              </text>
              <text
                x="12"
                y="39"
                className="mono"
                fontSize="14"
                fontWeight="600"
                fill={k === "idle" ? "#9fb0c6" : "var(--chalk)"}
              >
                {n.code}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mono relative z-10 flex items-center justify-between px-5 pb-4 text-[10px] tracking-[0.14em] text-muted-2">
        <span>
          {selected
            ? `EPICENTRE · ${nodeById.get(selected)?.code ?? ""} REVISED`
            : "SELECT A DOCUMENT"}
        </span>
        <span>CLICK ANY NODE TO TRACE ITS BLAST RADIUS</span>
      </div>
    </div>
  );
}
