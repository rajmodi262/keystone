"use client";

import { useRef, useState } from "react";
import { api } from "@/lib/trpc/client";
import { ImpactGraph } from "./impact-graph";
import { AskPanel } from "./ask-panel";
import { UploadPanel } from "./upload-panel";
import { ReviseEditor } from "./revise-editor";
import { ConflictCard } from "./conflict-card";

const discColor: Record<string, string> = {
  SPEC: "var(--blueprint)",
  STRUCT: "var(--blueprint)",
  ARCH: "var(--blueprint)",
  MECH: "var(--muted)",
  ELEC: "var(--muted)",
  CIVIL: "var(--muted)",
  RFI: "var(--hazard)",
  OTHER: "var(--muted-2)",
};

export function ProjectWorkspace({ projectId }: { projectId: string }) {
  const graph = api.documents.graph.useQuery({ projectId });
  const conflicts = api.conflicts.list.useQuery({ projectId });
  const docs = api.documents.list.useQuery({ projectId });
  const utils = api.useUtils();
  const setStatus = api.conflicts.setStatus.useMutation({
    onSuccess: () => utils.conflicts.list.invalidate({ projectId }),
  });
  const detect = api.conflicts.detect.useMutation({
    onSuccess: () => utils.conflicts.list.invalidate({ projectId }),
  });

  const [revisingId, setRevisingId] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ id: string; nonce: number } | null>(null);
  const [banner, setBanner] = useState<{
    code: string;
    revision: string;
    affected: number;
    conflicts: number;
  } | null>(null);
  const nonceRef = useRef(0);

  const refreshAll = () => {
    utils.documents.graph.invalidate({ projectId });
    utils.documents.list.invalidate({ projectId });
    utils.conflicts.list.invalidate({ projectId });
  };

  const conflictDocIds = new Set<string>();
  conflicts.data?.forEach((c) => {
    conflictDocIds.add(c.docA.id);
    conflictDocIds.add(c.docB.id);
  });

  return (
    <div className="space-y-6">
      {banner && (
        <div className="flex items-center justify-between rounded border border-hazard/40 bg-hazard/5 px-4 py-3">
          <span className="mono text-[11px] text-hazard">
            ⚡ {banner.code} → Rev {banner.revision} committed — {banner.affected}{" "}
            document{banner.affected === 1 ? "" : "s"} in the blast radius ·{" "}
            {banner.conflicts} open conflict{banner.conflicts === 1 ? "" : "s"}
          </span>
          <button
            onClick={() => setBanner(null)}
            className="mono text-[10px] tracking-[0.14em] text-muted-2 transition-colors hover:text-chalk"
          >
            DISMISS
          </button>
        </div>
      )}

      {!graph.data ? (
        <div className="flex h-[380px] items-center justify-center rounded border border-line bg-graphite/40">
          <span className="mono text-[11px] tracking-[0.2em] text-muted-2">
            LOADING GRAPH…
          </span>
        </div>
      ) : graph.data.nodes.length > 0 ? (
        <ImpactGraph
          nodes={graph.data.nodes}
          edges={graph.data.edges}
          conflictDocIds={conflictDocIds}
          focusId={focus?.id}
          focusNonce={focus?.nonce}
        />
      ) : (
        <div className="relative flex h-[380px] flex-col items-center justify-center overflow-hidden rounded border border-dashed border-line bg-graphite/40 text-center">
          <div className="lt-grid opacity-50" />
          <p className="mono relative z-10 text-[11px] tracking-[0.24em] text-muted-2">
            EMPTY PROJECT
          </p>
          <h3 className="relative z-10 mt-3 text-xl font-medium">
            Upload a document to begin
          </h3>
          <p className="relative z-10 mt-2 max-w-md text-sm text-muted">
            Add a spec or drawing (PDF) below. Keystone extracts its references to
            build the dependency graph, then watches for contradictions across the
            set.
          </p>
          <p className="relative z-10 mt-4 mono text-[18px] text-blueprint">↓</p>
        </div>
      )}

      {revisingId && (
        <ReviseEditor
          documentId={revisingId}
          onCancel={() => setRevisingId(null)}
          onCommitted={(r) => {
            setRevisingId(null);
            refreshAll();
            nonceRef.current += 1;
            setFocus({ id: r.documentId, nonce: nonceRef.current });
            setBanner({
              code: r.code,
              revision: r.revision,
              affected: r.affectedCount,
              conflicts: r.conflicts,
            });
          }}
        />
      )}

      <UploadPanel projectId={projectId} onUploaded={refreshAll} />

      <div className="grid gap-6 lg:grid-cols-2">
        <AskPanel projectId={projectId} />

        <div className="rounded border border-line bg-graphite/60 p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="mono text-[10px] tracking-[0.24em] text-muted-2">
              DETECTED CONFLICTS
            </span>
            <button
              onClick={() => detect.mutate({ projectId })}
              disabled={detect.isPending}
              className="mono rounded border border-line px-2.5 py-1 text-[9px] tracking-[0.14em] text-muted transition-colors hover:border-blueprint hover:text-blueprint disabled:opacity-50"
            >
              {detect.isPending ? "SCANNING…" : "RE-SCAN"}
            </button>
          </div>

          {conflicts.data?.length === 0 && (
            <p className="mono text-[11px] text-muted">
              No open contradictions. The lighttable is clear.
            </p>
          )}

          <div className="space-y-2">
            {conflicts.data?.map((c) => (
              <ConflictCard
                key={c.id}
                conflict={c}
                onSetStatus={(status) =>
                  setStatus.mutate({ conflictId: c.id, status })
                }
              />
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded border border-line">
        <div className="mono border-b border-line bg-graphite/60 px-5 py-3 text-[10px] tracking-[0.24em] text-muted-2">
          DOCUMENTS · {docs.data?.length ?? 0}
        </div>
        <table className="w-full">
          <tbody>
            {docs.data?.map((d) => (
              <tr key={d.id} className="border-b border-line/60 last:border-0">
                <td className="px-5 py-3">
                  <span className="mono text-[13px] font-semibold text-chalk">
                    {d.code}
                  </span>
                </td>
                <td className="py-3 text-[13px] text-muted">{d.title}</td>
                <td className="py-3">
                  <span
                    className="mono text-[9px] tracking-[0.14em]"
                    style={{ color: discColor[d.discipline] ?? "var(--muted)" }}
                  >
                    {d.discipline}
                  </span>
                </td>
                <td className="mono py-3 text-[10px] text-blueprint">
                  Rev {d.revision}
                </td>
                <td className="mono py-3 text-right text-[10px] text-muted-2">
                  {d._count.refsOut}→ · {d._count.refsIn}← · {d._count.chunks}▦
                </td>
                <td className="py-3 pl-4 pr-5 text-right">
                  <button
                    onClick={() => setRevisingId(d.id)}
                    className="mono rounded border border-line px-2.5 py-1 text-[9px] tracking-[0.14em] text-muted transition-colors hover:border-blueprint hover:text-blueprint"
                  >
                    REVISE
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
