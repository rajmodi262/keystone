"use client";

import { useEffect } from "react";
import { api } from "@/lib/trpc/client";

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

export function DocumentDrawer({
  documentId,
  onClose,
}: {
  documentId: string;
  onClose: () => void;
}) {
  const doc = api.documents.get.useQuery({ documentId });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-xl overflow-y-auto border-l border-line bg-graphite p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {!doc.data ? (
          <p className="mono text-[11px] tracking-[0.2em] text-muted-2">LOADING…</p>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div>
                <div
                  className="mono text-[10px] tracking-[0.24em]"
                  style={{ color: discColor[doc.data.discipline] ?? "var(--muted)" }}
                >
                  {doc.data.discipline} · REV {doc.data.revision}
                </div>
                <h2 className="mono mt-1 text-2xl font-semibold text-chalk">
                  {doc.data.code}
                </h2>
                <p className="text-sm text-muted">{doc.data.title}</p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="mono rounded border border-line px-2 py-1 text-[12px] text-muted transition-colors hover:border-blueprint hover:text-chalk"
              >
                ✕
              </button>
            </div>

            <div className="mt-6">
              <div className="mono mb-2 text-[10px] tracking-[0.24em] text-muted-2">
                REFERENCES OUT ({doc.data.refsOut.length})
              </div>
              {doc.data.refsOut.length === 0 ? (
                <p className="mono text-[11px] text-muted-2">none</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {doc.data.refsOut.map((r, i) => (
                    <span
                      key={i}
                      className="mono rounded border border-line px-2 py-1 text-[10px]"
                      style={{
                        color: r.toDocId ? "var(--blueprint)" : "var(--muted-2)",
                      }}
                    >
                      {r.toCode}
                      {!r.toDocId && " (unresolved)"}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6">
              <div className="mono mb-2 text-[10px] tracking-[0.24em] text-muted-2">
                DOCUMENT TEXT
              </div>
              <pre className="mono max-h-[55vh] overflow-y-auto whitespace-pre-wrap rounded border border-line bg-ink/50 p-4 text-[12px] leading-relaxed text-chalk">
                {doc.data.rawText}
              </pre>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
