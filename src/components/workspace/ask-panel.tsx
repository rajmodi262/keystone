"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/client";

const SUGGESTIONS = [
  "What concrete strength is required?",
  "What paint system is specified?",
];

export function AskPanel({ projectId }: { projectId: string }) {
  const [q, setQ] = useState("");
  const ask = api.ai.ask.useMutation();
  const result = ask.data;

  const run = (question: string) => {
    if (!question.trim()) return;
    setQ(question);
    ask.mutate({ projectId, question });
  };

  return (
    <div className="rounded border border-line bg-graphite/60 p-5">
      <div className="mono mb-3 text-[10px] tracking-[0.24em] text-muted-2">
        ASK YOUR PROJECT
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(q);
        }}
        className="flex gap-2"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask across every document…"
          className="mono flex-1 rounded border border-line bg-ink/60 px-3 py-2.5 text-[13px] text-chalk outline-none placeholder:text-muted-2 focus:border-blueprint"
        />
        <button
          type="submit"
          disabled={ask.isPending}
          className="mono rounded bg-blueprint px-4 text-[11px] font-semibold tracking-[0.12em] text-[#06212e] transition-colors hover:bg-[#5ccfff] disabled:opacity-50"
        >
          {ask.isPending ? "…" : "ASK"}
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => run(s)}
            className="mono rounded-full border border-line px-3 py-1 text-[10px] text-muted transition-colors hover:border-blueprint hover:text-blueprint"
          >
            {s}
          </button>
        ))}
      </div>

      {ask.isError && (
        <p className="mono mt-4 rounded border border-danger/40 bg-danger/10 px-3 py-2 text-[11px] text-danger">
          {ask.error.message}
        </p>
      )}

      {result?.type === "conflict" && (
        <div className="mt-4 rounded border border-danger/40 bg-danger/5 p-4">
          <div className="mono mb-1 flex items-center justify-between text-[11px] tracking-[0.18em] text-danger">
            <span className="flex items-center gap-2">
              <span className="inline-grid h-4 w-4 place-items-center rounded-full border border-danger text-[10px]">
                !
              </span>
              CONTRADICTION · {result.topic}
            </span>
            <span className="rounded border border-danger/50 px-1.5 py-0.5 text-[8px]">
              {result.severity}
            </span>
          </div>
          <p className="mono mb-3 text-[11px] text-muted">
            Two governing sources disagree.
          </p>
          <div className="space-y-2">
            {result.sources.map((s, i) => (
              <div
                key={i}
                className={`flex items-center justify-between rounded border px-3 py-2 ${
                  i === 0
                    ? "border-line bg-blueprint/5"
                    : "border-danger/40 bg-danger/10"
                }`}
              >
                <span className="mono text-[10px] text-muted">
                  <b className="text-chalk">{s.code}</b> · Rev {s.revision}
                </span>
                <span
                  className={`mono text-base font-semibold ${
                    i === 0 ? "text-chalk" : "text-danger"
                  }`}
                >
                  {s.value}
                </span>
              </div>
            ))}
          </div>
          <p className="mono mt-3 text-[10px] leading-relaxed text-muted">
            {result.governingCode ? (
              <>
                ▸ <span className="text-blueprint">{result.governingCode} governs</span>{" "}
                — {result.rationale}
              </>
            ) : (
              <>▸ {result.rationale}</>
            )}
          </p>
        </div>
      )}

      {result?.type === "answer" && (
        <div className="mt-4 rounded border border-line bg-ink/40 p-4">
          <p className="text-[13px] leading-relaxed text-chalk">{result.answer}</p>
          <div className="mono mt-3 flex flex-wrap gap-2 text-[9px] text-muted-2">
            {result.citations.slice(0, 4).map((c) => (
              <span key={c.documentId} className="rounded border border-line px-2 py-0.5">
                {c.code} · {(c.score * 100).toFixed(0)}%
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
