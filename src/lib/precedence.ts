// Domain logic that turns a raw contradiction into an actionable finding:
// a severity (life-safety vs cosmetic) and a recommended governing document
// based on standard AEC contract order-of-precedence. Pure + deterministic, so
// it's fully explainable on demand (no black box).

export type Severity = "CRITICAL" | "HIGH" | "MODERATE" | "LOW";

const SEV_RANK: Record<Severity, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MODERATE: 2,
  LOW: 1,
};

export function severityRank(s: Severity): number {
  return SEV_RANK[s];
}

// Weight by what the disagreement actually endangers.
export function classifySeverity(
  topic: string,
  discA: string,
  discB: string,
): Severity {
  const t = topic.toLowerCase();
  const structural = [discA, discB].some((d) => d === "STRUCT" || d === "CIVIL");
  if (
    t.includes("fire") ||
    t.includes("strength") ||
    t.includes("concrete") ||
    t.includes("load") ||
    t.includes("structural") ||
    structural
  )
    return "CRITICAL";
  if (
    t.includes("dimension") ||
    t.includes("anchor") ||
    t.includes("bolt") ||
    t.includes("clearance")
  )
    return "HIGH";
  if (
    t.includes("paint") ||
    t.includes("finish") ||
    t.includes("ceiling") ||
    t.includes("color")
  )
    return "LOW";
  return "MODERATE";
}

// Higher rank = more current. Letters A<B<C…, then numbered revisions, then
// "open"/unknown lowest.
function revRank(rev: string): number {
  const r = (rev ?? "").trim();
  if (/^[A-Za-z]$/.test(r)) return r.toUpperCase().charCodeAt(0);
  const n = parseInt(r, 10);
  if (!Number.isNaN(n)) return 1000 + n;
  return 0;
}

export interface PartyRef {
  code: string;
  discipline: string;
  revision: string;
}

export interface Recommendation {
  governingCode: string | null;
  rationale: string;
}

// Standard AEC order of precedence:
//   1. The more current revision supersedes an older one.
//   2. Otherwise the specification governs the drawing for material requirements.
//   3. Otherwise: no clear precedence — escalate via RFI.
export function recommendGoverning(a: PartyRef, b: PartyRef): Recommendation {
  const ra = revRank(a.revision);
  const rb = revRank(b.revision);
  if (ra !== rb) {
    const win = ra > rb ? a : b;
    const lose = ra > rb ? b : a;
    return {
      governingCode: win.code,
      rationale: `${win.code} (Rev ${win.revision}) supersedes ${lose.code} (Rev ${lose.revision}) as the more current revision.`,
    };
  }
  const aSpec = a.discipline === "SPEC";
  const bSpec = b.discipline === "SPEC";
  if (aSpec !== bSpec) {
    const win = aSpec ? a : b;
    const lose = aSpec ? b : a;
    return {
      governingCode: win.code,
      rationale: `By standard order of precedence, specification ${win.code} governs over drawing ${lose.code} for material requirements.`,
    };
  }
  return {
    governingCode: null,
    rationale:
      "No clear precedence between equal-rank documents — raise an RFI for a governing decision.",
  };
}
