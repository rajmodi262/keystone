"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/trpc/client";

export function ReviseEditor({
  documentId,
  onCommitted,
  onCancel,
}: {
  documentId: string;
  onCommitted: (r: {
    documentId: string;
    code: string;
    revision: string;
    affectedCount: number;
    conflicts: number;
  }) => void;
  onCancel: () => void;
}) {
  const doc = api.documents.get.useQuery({ documentId });
  const [text, setText] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!loaded && doc.data?.rawText != null) {
      setText(doc.data.rawText);
      setLoaded(true);
    }
  }, [doc.data?.rawText, loaded]);

  const revise = api.documents.revise.useMutation({
    onSuccess: (r) =>
      onCommitted({
        documentId: r.documentId,
        code: r.code,
        revision: r.revision,
        affectedCount: r.affectedCount,
        conflicts: r.conflicts,
      }),
  });

  return (
    <div className="rounded border border-blueprint/40 bg-graphite/70 p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="mono text-[10px] tracking-[0.24em] text-blueprint">
          REVISE {doc.data?.code ?? "…"}
        </span>
        <span className="mono text-[10px] text-muted-2">
          edit the text, then commit to fire the blast radius
        </span>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        spellCheck={false}
        className="mono w-full rounded border border-line bg-ink/60 p-3 text-[12px] leading-relaxed text-chalk outline-none focus:border-blueprint"
      />
      {revise.error && (
        <p className="mono mt-2 text-[11px] text-danger">{revise.error.message}</p>
      )}
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => revise.mutate({ documentId, rawText: text })}
          disabled={revise.isPending || !text.trim()}
          className="mono rounded bg-blueprint px-4 py-2 text-[11px] font-semibold tracking-[0.12em] text-[#06212e] transition-colors hover:bg-[#5ccfff] disabled:opacity-50"
        >
          {revise.isPending ? "COMMITTING…" : "COMMIT REVISION"}
        </button>
        <button
          onClick={onCancel}
          className="mono rounded border border-line px-4 py-2 text-[11px] tracking-[0.12em] text-muted transition-colors hover:text-chalk"
        >
          CANCEL
        </button>
      </div>
    </div>
  );
}
