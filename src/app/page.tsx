import Link from "next/link";

function Crop({ className }: { className: string }) {
  return (
    <span
      className={`pointer-events-none absolute h-3.5 w-3.5 border-blueprint/60 ${className}`}
    />
  );
}

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="lt-grid" />
      <div
        className="pointer-events-none absolute inset-0 animate-spin-slow opacity-70"
        style={{
          background:
            "conic-gradient(from 0deg at 50% 42%, transparent 320deg, rgba(57,194,255,.10) 350deg, rgba(57,194,255,.22) 359deg, transparent 360deg)",
          mixBlendMode: "screen",
          WebkitMaskImage:
            "radial-gradient(55% 55% at 50% 42%, #000 0%, transparent 75%)",
          maskImage:
            "radial-gradient(55% 55% at 50% 42%, #000 0%, transparent 75%)",
        }}
      />

      {/* title-block frame */}
      <div className="pointer-events-none absolute inset-4 border border-[var(--hair-strong)] md:inset-6">
        <Crop className="left-[-1px] top-[-1px] border-b-0 border-r-0" />
        <Crop className="right-[-1px] top-[-1px] border-b-0 border-l-0" />
        <Crop className="bottom-[-1px] left-[-1px] border-r-0 border-t-0" />
        <Crop className="bottom-[-1px] right-[-1px] border-l-0 border-t-0" />
      </div>

      {/* top bar */}
      <header className="relative z-10 flex items-center justify-between px-8 py-7 md:px-12">
        <div className="flex items-center gap-3">
          <div className="relative h-6 w-6">
            <span className="absolute inset-0 border-[1.5px] border-blueprint" />
            <span className="absolute inset-0 rotate-45 border-[1.5px] border-blueprint opacity-50" />
          </div>
          <span className="text-sm font-semibold tracking-[0.34em]">KEYSTONE</span>
        </div>
        <Link
          href="/sign-in"
          className="mono rounded border border-[var(--hair-strong)] bg-blueprint/5 px-5 py-2.5 text-[11px] tracking-[0.14em] text-chalk transition-all duration-200 hover:border-blueprint hover:bg-blueprint/15"
        >
          SIGN IN
        </Link>
      </header>

      {/* hero */}
      <section className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 pt-20 text-center md:pt-28">
        <div className="mono mb-7 inline-flex items-center gap-2.5 rounded-full border border-[var(--hair-strong)] px-4 py-1.5 text-[10px] tracking-[0.24em] text-blueprint">
          <span className="lt-blip h-1.5 w-1.5 rounded-full bg-blueprint" />
          AEC DOCUMENT INTELLIGENCE
        </div>

        <h1 className="text-balance text-4xl font-medium leading-[1.08] tracking-tight md:text-6xl">
          Your documents{" "}
          <span className="text-danger">contradict each other.</span>
          <br />
          Keystone catches it first.
        </h1>

        <p className="mt-7 max-w-xl text-balance text-base leading-relaxed text-muted md:text-lg">
          A lighttable for construction documents. The AI reads across every spec
          and drawing to surface contradictions other tools hide — and maps the
          blast radius of every revision before it reaches the site.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/sign-up"
            className="mono rounded bg-blueprint px-7 py-3.5 text-[12px] font-semibold tracking-[0.14em] text-[#06212e] transition-all duration-200 hover:bg-[#5ccfff]"
          >
            ENTER THE LIGHTTABLE
          </Link>
          <a
            href="/demo.html"
            target="_blank"
            rel="noreferrer"
            className="mono rounded border border-[var(--hair-strong)] px-7 py-3.5 text-[12px] tracking-[0.14em] text-chalk transition-all duration-200 hover:border-blueprint hover:bg-blueprint/10"
          >
            SEE THE BLAST RADIUS
          </a>
        </div>
      </section>

      {/* feature triad */}
      <section className="relative z-10 mx-auto mt-24 grid max-w-5xl gap-px overflow-hidden rounded border border-line bg-line sm:grid-cols-3 md:mt-32">
        {[
          {
            k: "01",
            t: "Conflict-aware AI",
            d: "Ask a question; if two documents disagree, Keystone shows the contradiction instead of a false confident answer.",
            c: "var(--danger)",
          },
          {
            k: "02",
            t: "Impact graph",
            d: "Revise one document and watch the blast radius — every drawing and RFI downstream that just went stale.",
            c: "var(--hazard)",
          },
          {
            k: "03",
            t: "Built on your stack",
            d: "Multi-tenant, role-based access over a managed users database, with an MCP server for AI clients.",
            c: "var(--blueprint)",
          },
        ].map((f) => (
          <div key={f.k} className="bg-graphite/80 p-7">
            <div className="mono mb-4 flex items-center justify-between text-[10px] tracking-[0.24em] text-muted-2">
              <span>{f.k}</span>
              <span
                className="h-2 w-2 rounded-[1px]"
                style={{ background: f.c }}
              />
            </div>
            <h3 className="text-lg font-medium">{f.t}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{f.d}</p>
          </div>
        ))}
      </section>

      <footer className="mono relative z-10 mt-20 flex items-center justify-between px-8 py-8 text-[10px] tracking-[0.2em] text-muted-2 md:px-12">
        <span>KEYSTONE / THE LIGHTTABLE</span>
        <span>RIVERSIDE HOSPITAL — PHASE 2</span>
      </footer>
    </main>
  );
}
