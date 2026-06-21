"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/trpc/client";

const primary =
  "mono rounded bg-blueprint px-4 py-2 text-[11px] font-semibold tracking-[0.12em] text-[#06212e] transition-colors hover:bg-[#5ccfff] disabled:opacity-50";
const ghost =
  "mono rounded border border-line px-4 py-2 text-[11px] tracking-[0.12em] text-muted transition-colors hover:border-blueprint hover:text-blueprint disabled:opacity-50";
const field =
  "mono rounded border border-line bg-ink/60 px-3 py-2 text-[12px] text-chalk outline-none placeholder:text-muted-2 focus:border-blueprint";

export function OrgActions({
  orgId,
  hasProjects,
}: {
  orgId: string;
  hasProjects: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const create = api.projects.create.useMutation({
    onSuccess: (p) => router.push(`/app/projects/${p.id}`),
  });
  const sample = api.projects.createSample.useMutation({
    onSuccess: (r) => router.push(`/app/projects/${r.id}`),
  });
  const busy = create.isPending || sample.isPending;
  const error = create.error || sample.error;

  return (
    <div className="mt-4">
      {!hasProjects && !open && (
        <div className="rounded border border-dashed border-line bg-ink/30 p-5 text-center">
          <p className="mono text-[11px] tracking-[0.08em] text-muted">
            No projects yet.
          </p>
          <p className="mt-1 text-[13px] text-muted-2">
            Create one, or load a sample to see the impact graph and conflict
            detection instantly.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button onClick={() => setOpen(true)} className={primary} disabled={busy}>
              + NEW PROJECT
            </button>
            <button
              onClick={() => sample.mutate({ orgId })}
              className={ghost}
              disabled={busy}
            >
              {sample.isPending ? "BUILDING SAMPLE…" : "LOAD SAMPLE PROJECT"}
            </button>
          </div>
        </div>
      )}

      {hasProjects && !open && (
        <button onClick={() => setOpen(true)} className={ghost} disabled={busy}>
          + NEW PROJECT
        </button>
      )}

      {open && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate({ orgId, name, code });
          }}
          className="flex flex-wrap items-center gap-2"
        >
          <input
            className={`${field} flex-1`}
            placeholder="Project name (e.g. Harbor Tower)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className={`${field} w-28`}
            placeholder="Code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
          <button type="submit" className={primary} disabled={busy}>
            {create.isPending ? "CREATING…" : "CREATE"}
          </button>
          <button type="button" className={ghost} onClick={() => setOpen(false)}>
            CANCEL
          </button>
        </form>
      )}

      {error && (
        <p className="mono mt-2 text-[11px] text-danger">{error.message}</p>
      )}
    </div>
  );
}
