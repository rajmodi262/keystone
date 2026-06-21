import { db } from "@/lib/db";
import { extractClaims, inferTopic } from "@/lib/claims";

// Only authoritative documents are conflict "parties". RFIs *ask about*
// conflicts; they aren't a source of truth, so they never count as a side.
const PARTY_DISCIPLINES = ["SPEC", "STRUCT", "ARCH", "MECH", "ELEC", "CIVIL"];

// Recompute conflicts for a project: two graph-adjacent documents that assert
// different values for the same unit are flagged. Precision over recall —
// requiring a reference edge between them keeps false positives down.
export async function detectConflicts(projectId: string) {
  const [docs, edges] = await Promise.all([
    db.document.findMany({
      where: { projectId },
      select: { id: true, code: true, discipline: true, rawText: true },
    }),
    db.reference.findMany({
      where: { projectId, toDocId: { not: null } },
      select: { fromDocId: true, toDocId: true },
    }),
  ]);

  const adjacent = new Set<string>();
  for (const e of edges) {
    if (!e.toDocId) continue;
    adjacent.add(`${e.fromDocId}|${e.toDocId}`);
    adjacent.add(`${e.toDocId}|${e.fromDocId}`);
  }

  const parties = docs.filter((d) => PARTY_DISCIPLINES.includes(d.discipline));
  const claims = new Map(parties.map((d) => [d.id, extractClaims(d.rawText ?? "")]));

  await db.conflict.deleteMany({ where: { projectId } });

  const seen = new Set<string>();
  const created = [];
  for (let i = 0; i < parties.length; i++) {
    for (let j = i + 1; j < parties.length; j++) {
      const a = parties[i];
      const b = parties[j];
      if (!adjacent.has(`${a.id}|${b.id}`)) continue;

      const ca = claims.get(a.id) ?? [];
      const cb = claims.get(b.id) ?? [];
      const unitsA = Array.from(new Set(ca.map((c) => c.unitKey)));

      for (const unit of unitsA) {
        const av = ca.filter((c) => c.unitKey === unit);
        const bv = cb.filter((c) => c.unitKey === unit);
        if (!bv.length) continue;

        let pair: [(typeof av)[0], (typeof bv)[0]] | null = null;
        for (const x of av)
          for (const y of bv)
            if (x.value !== y.value) {
              pair = [x, y];
              break;
            }
        if (!pair) continue;

        const key = `${a.id}|${b.id}|${unit}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const conflict = await db.conflict.create({
          data: {
            projectId,
            topic: inferTopic(unit, `${pair[0].context} ${pair[1].context}`),
            docAId: a.id,
            docBId: b.id,
            valueA: pair[0].raw,
            valueB: pair[1].raw,
            detail: `${a.code}: "${pair[0].context}"  ·  ${b.code}: "${pair[1].context}"`,
            status: "OPEN",
          },
        });
        created.push(conflict);
      }
    }
  }
  return created;
}
