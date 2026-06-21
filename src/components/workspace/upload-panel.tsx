"use client";

import { useRef, useState } from "react";

const DISCIPLINES = ["SPEC", "STRUCT", "ARCH", "MECH", "ELEC", "CIVIL", "RFI", "OTHER"];

export function UploadPanel({
  projectId,
  onUploaded,
}: {
  projectId: string;
  onUploaded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "",
    title: "",
    discipline: "SPEC",
    revision: "A",
  });
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOk(null);
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Choose a PDF first.");
      return;
    }
    const fd = new FormData();
    fd.set("projectId", projectId);
    fd.set("code", form.code);
    fd.set("title", form.title);
    fd.set("discipline", form.discipline);
    fd.set("revision", form.revision);
    fd.set("file", file);

    setBusy(true);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        return;
      }
      setOk(`Ingested ${form.code} — ${data.chunks} chunks, ${data.refs} references.`);
      setForm({ code: "", title: "", discipline: "SPEC", revision: "A" });
      if (fileRef.current) fileRef.current.value = "";
      onUploaded();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  };

  const field =
    "mono w-full rounded border border-line bg-ink/60 px-3 py-2 text-[12px] text-chalk outline-none placeholder:text-muted-2 focus:border-blueprint";

  return (
    <div className="rounded border border-line bg-graphite/60 p-5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="mono flex w-full items-center justify-between text-[10px] tracking-[0.24em] text-muted-2"
      >
        <span>ADD DOCUMENT (PDF)</span>
        <span className="text-blueprint">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <form onSubmit={submit} className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              className={field}
              placeholder="Code · e.g. S-203"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              required
            />
            <input
              className={field}
              placeholder="Revision · A"
              value={form.revision}
              onChange={(e) => setForm({ ...form, revision: e.target.value })}
            />
          </div>
          <input
            className={field}
            placeholder="Title · e.g. Roof Framing Plan"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <select
            className={field}
            value={form.discipline}
            onChange={(e) => setForm({ ...form, discipline: e.target.value })}
          >
            {DISCIPLINES.map((d) => (
              <option key={d} value={d} className="bg-graphite">
                {d}
              </option>
            ))}
          </select>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="mono w-full text-[11px] text-muted file:mr-3 file:rounded file:border file:border-line file:bg-blueprint/10 file:px-3 file:py-1.5 file:text-[10px] file:tracking-[0.1em] file:text-blueprint"
          />

          {error && <p className="mono text-[11px] text-danger">{error}</p>}
          {ok && <p className="mono text-[11px] text-blueprint">{ok}</p>}

          <button
            type="submit"
            disabled={busy}
            className="mono w-full rounded bg-blueprint py-2.5 text-[11px] font-semibold tracking-[0.12em] text-[#06212e] transition-colors hover:bg-[#5ccfff] disabled:opacity-50"
          >
            {busy ? "PARSING & EMBEDDING…" : "UPLOAD & INGEST"}
          </button>
        </form>
      )}
    </div>
  );
}
