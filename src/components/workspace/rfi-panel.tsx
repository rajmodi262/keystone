"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/client";

const statusColor: Record<string, string> = {
  OPEN: "var(--hazard)",
  ANSWERED: "var(--blueprint)",
  CLOSED: "var(--muted-2)",
};

export function RfiPanel({
  projectId,
  canEdit,
}: {
  projectId: string;
  canEdit: boolean;
}) {
  const utils = api.useUtils();
  const rfis = api.rfi.list.useQuery({ projectId });
  const invalidate = () => utils.rfi.list.invalidate({ projectId });
  const create = api.rfi.create.useMutation({
    onSuccess: () => {
      invalidate();
      setQ("");
    },
  });
  const answer = api.rfi.answer.useMutation({ onSuccess: invalidate });
  const setStatus = api.rfi.setStatus.useMutation({ onSuccess: invalidate });

  const [q, setQ] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const err = create.error || answer.error || setStatus.error;

  return (
    <div className="rounded border border-line bg-graphite/60 p-5">
      <div className="mono mb-3 text-[10px] tracking-[0.24em] text-muted-2">
        RFIs · {rfis.data?.length ?? 0}
      </div>

      {canEdit && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) create.mutate({ projectId, question: q });
          }}
          className="mb-3 flex gap-2"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Raise an RFI…"
            className="mono flex-1 rounded border border-line bg-ink/60 px-3 py-2 text-[12px] text-chalk outline-none placeholder:text-muted-2 focus:border-blueprint"
          />
          <button
            type="submit"
            disabled={create.isPending}
            className="mono rounded bg-blueprint px-3 text-[11px] font-semibold tracking-[0.12em] text-[#06212e] transition-colors hover:bg-[#5ccfff] disabled:opacity-50"
          >
            RAISE
          </button>
        </form>
      )}

      {rfis.data?.length === 0 && (
        <p className="mono text-[11px] text-muted">No RFIs yet.</p>
      )}

      <div className="space-y-2">
        {rfis.data?.map((r) => {
          const color = statusColor[r.status] ?? "var(--muted)";
          return (
            <div key={r.id} className="rounded border border-line bg-ink/40 p-3">
              <div className="mono mb-1 flex items-center justify-between text-[11px]">
                <span className="text-chalk">
                  RFI-{String(r.number).padStart(2, "0")}
                </span>
                <span className="text-[9px] tracking-[0.14em]" style={{ color }}>
                  {r.status}
                </span>
              </div>
              <p className="text-[12px] text-muted">{r.question}</p>
              {r.answer && (
                <p className="mono mt-2 rounded border border-line bg-graphite/60 p-2 text-[11px] text-chalk">
                  ↳ {r.answer}
                </p>
              )}
              {canEdit && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {r.status !== "CLOSED" && (
                    <>
                      <input
                        value={answers[r.id] ?? ""}
                        onChange={(e) =>
                          setAnswers((a) => ({ ...a, [r.id]: e.target.value }))
                        }
                        placeholder="Answer…"
                        className="mono flex-1 rounded border border-line bg-ink/60 px-2 py-1 text-[11px] text-chalk outline-none focus:border-blueprint"
                      />
                      <button
                        onClick={() => {
                          const a = answers[r.id];
                          if (a?.trim()) answer.mutate({ rfiId: r.id, answer: a });
                        }}
                        className="mono rounded border border-line px-2 py-1 text-[9px] text-muted transition-colors hover:border-blueprint hover:text-blueprint"
                      >
                        ANSWER
                      </button>
                    </>
                  )}
                  {r.status !== "CLOSED" ? (
                    <button
                      onClick={() => setStatus.mutate({ rfiId: r.id, status: "CLOSED" })}
                      className="mono rounded border border-line px-2 py-1 text-[9px] text-muted-2 transition-colors hover:text-chalk"
                    >
                      CLOSE
                    </button>
                  ) : (
                    <button
                      onClick={() => setStatus.mutate({ rfiId: r.id, status: "OPEN" })}
                      className="mono rounded border border-line px-2 py-1 text-[9px] text-muted-2 transition-colors hover:text-chalk"
                    >
                      REOPEN
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {err && <p className="mono mt-2 text-[11px] text-danger">{err.message}</p>}
    </div>
  );
}
