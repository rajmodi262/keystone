import Link from "next/link";
import type { ReactNode } from "react";

export function AuthShell({
  kicker,
  title,
  subtitle,
  children,
  footer,
}: {
  kicker: string;
  title: ReactNode;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="relative grid min-h-screen lg:grid-cols-2">
      {/* brand panel */}
      <div className="relative hidden overflow-hidden border-r border-line lg:block">
        <div className="lt-grid" />
        <div
          className="pointer-events-none absolute inset-0 animate-spin-slow opacity-60"
          style={{
            background:
              "conic-gradient(from 0deg at 50% 50%, transparent 320deg, rgba(57,194,255,.10) 350deg, rgba(57,194,255,.22) 359deg, transparent 360deg)",
            mixBlendMode: "screen",
            WebkitMaskImage:
              "radial-gradient(55% 55% at 50% 50%, #000 0%, transparent 75%)",
            maskImage:
              "radial-gradient(55% 55% at 50% 50%, #000 0%, transparent 75%)",
          }}
        />
        <div className="relative z-10 flex h-full flex-col justify-between p-12">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative h-6 w-6">
              <span className="absolute inset-0 border-[1.5px] border-blueprint" />
              <span className="absolute inset-0 rotate-45 border-[1.5px] border-blueprint opacity-50" />
            </div>
            <span className="text-sm font-semibold tracking-[0.34em]">
              KEYSTONE
            </span>
          </Link>
          <div>
            <p className="mono text-[11px] leading-relaxed tracking-[0.18em] text-muted">
              &ldquo;The dangerous answer isn&rsquo;t &lsquo;I don&rsquo;t
              know&rsquo; — it&rsquo;s a confident answer that ignores the
              document that disagrees.&rdquo;
            </p>
            <p className="mono mt-4 text-[10px] tracking-[0.24em] text-muted-2">
              THE LIGHTTABLE / DESIGN THESIS
            </p>
          </div>
        </div>
      </div>

      {/* form panel */}
      <div className="relative flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="mono mb-3 inline-flex items-center gap-2 text-[10px] tracking-[0.24em] text-blueprint">
            <span className="lt-blip h-1.5 w-1.5 rounded-full bg-blueprint" />
            {kicker}
          </div>
          <h1 className="text-2xl font-medium tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <div className="mono mt-7 text-[11px] tracking-[0.06em] text-muted">
            {footer}
          </div>
        </div>
      </div>
    </main>
  );
}

export const fieldCls =
  "mono w-full rounded border border-line bg-graphite/60 px-3.5 py-3 text-sm text-chalk outline-none transition-colors placeholder:text-muted-2 focus:border-blueprint";

export const labelCls =
  "mono mb-1.5 block text-[10px] tracking-[0.18em] text-muted";

export const primaryBtnCls =
  "mono w-full rounded bg-blueprint px-4 py-3 text-[12px] font-semibold tracking-[0.14em] text-[#06212e] transition-all duration-200 hover:bg-[#5ccfff] disabled:cursor-not-allowed disabled:opacity-50";
