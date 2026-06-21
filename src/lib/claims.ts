// Extract quantitative "claims" (value + unit) from document text. This is what
// lets Keystone notice that two documents assert different numbers for the same
// thing — the basis of heuristic conflict detection and conflict-aware answers.
const CLAIM =
  /(\d+(?:\.\d+)?)\s*(MPa|kPa|psi|kN|mm|cm|kg|%|hours?|hrs?|minutes?|min)\b/gi;

// Collapse unit spellings to a canonical key for grouping.
function normalizeUnit(u: string): string {
  const l = u.toLowerCase();
  if (l.startsWith("hour") || l.startsWith("hr")) return "hr";
  if (l.startsWith("min")) return "min";
  return l;
}

export interface Claim {
  value: number;
  unit: string;
  unitKey: string;
  raw: string;
  context: string;
}

export function extractClaims(text: string): Claim[] {
  const out: Claim[] = [];
  const re = new RegExp(CLAIM);
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const start = Math.max(0, m.index - 45);
    const context = text
      .slice(start, m.index + m[0].length + 15)
      .replace(/\s+/g, " ")
      .trim();
    out.push({
      value: parseFloat(m[1]),
      unit: m[2],
      unitKey: normalizeUnit(m[2]),
      raw: m[0].replace(/\s+/g, " "),
      context,
    });
  }
  return out;
}

export function inferTopic(unitKey: string, context: string): string {
  const c = context.toLowerCase();
  if (unitKey === "mpa" || c.includes("concrete") || c.includes("strength"))
    return "Concrete compressive strength";
  if ((unitKey === "hr" || unitKey === "min") && (c.includes("fire") || c.includes("rating")))
    return "Fire-resistance rating";
  if (unitKey === "mm" && c.includes("slump")) return "Concrete slump";
  if (unitKey === "kg" || c.includes("load")) return "Load / weight";
  if (c.includes("anchor") || c.includes("bolt")) return "Anchor / bolt layout";
  return `${unitKey.toUpperCase()} specification`;
}
