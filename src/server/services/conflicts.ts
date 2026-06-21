import { db } from "@/lib/db";
import { extractClaims, inferTopic } from "@/lib/claims";
import { chat, hasLLM } from "@/lib/ai";

// Only authoritative documents are conflict "parties". RFIs *ask about*
// conflicts; they aren't a source of truth, so they never count as a side.
const PARTY_DISCIPLINES = ["SPEC", "STRUCT", "ARCH", "MECH", "ELEC", "CIVIL"];
const MAX_LLM_PAIRS = 12;

type Candidate = {
  topic: string;
  docAId: string;
  docBId: string;
  valueA: string;
  valueB: string;
  detail: string;
};

function key(c: Candidate) {
  return `${c.docAId}|${c.docBId}|${c.topic.toLowerCase()}`;
}

// LLM pass: catch *textual / semantic* contradictions a regex can't (active only
// when an LLM key is configured). Returns [] on any error so detection degrades
// gracefully to the heuristic baseline.
async function llmConflicts(
  a: { id: string; code: string; rawText: string | null },
  b: { id: string; code: string; rawText: string | null },
): Promise<Candidate[]> {
  const raw = await chat(
    "You compare two construction documents and report only genuine factual contradictions (different required values, ratings, materials, or directives for the same thing). Respond with a JSON array of objects {topic, valueA, valueB}. If there are none, respond with [].",
    `Document A (${a.code}):\n${(a.rawText ?? "").slice(0, 2500)}\n\nDocument B (${b.code}):\n${(b.rawText ?? "").slice(0, 2500)}`,
    0, // temperature 0 -> stable, repeatable detection
  );
  if (!raw) return [];

  // Grounding: only keep a contradiction if BOTH cited values literally appear
  // in the document pair. Kills hallucinated/unstable findings -> deterministic.
  const aText = (a.rawText ?? "").toLowerCase().replace(/\s+/g, " ");
  const bText = (b.rawText ?? "").toLowerCase().replace(/\s+/g, " ");
  const grounded = (v: string) => {
    const n = v.toLowerCase().replace(/\s+/g, " ").trim();
    return n.length > 0 && (aText.includes(n) || bText.includes(n));
  };

  try {
    const json = raw.replace(/```json|```/g, "").trim();
    const arr = JSON.parse(json) as Array<{ topic: string; valueA: string; valueB: string }>;
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x) => x && x.topic && x.valueA && x.valueB)
      .filter(
        (x) =>
          String(x.valueA) !== String(x.valueB) &&
          grounded(String(x.valueA)) &&
          grounded(String(x.valueB)),
      )
      .map((x) => ({
        topic: String(x.topic).slice(0, 120),
        docAId: a.id,
        docBId: b.id,
        valueA: String(x.valueA).slice(0, 80),
        valueB: String(x.valueB).slice(0, 80),
        detail: `${a.code} vs ${b.code} (semantic)`,
      }));
  } catch {
    return [];
  }
}

// Recompute conflicts for a project. Two graph-adjacent documents that assert
// different values for the same unit are flagged (heuristic), plus LLM-detected
// textual contradictions when a key is set. Requiring an edge keeps precision up.
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

  const candidates: Candidate[] = [];
  const adjacentPairs: [(typeof parties)[0], (typeof parties)[0]][] = [];

  for (let i = 0; i < parties.length; i++) {
    for (let j = i + 1; j < parties.length; j++) {
      const a = parties[i];
      const b = parties[j];
      if (!adjacent.has(`${a.id}|${b.id}`)) continue;
      adjacentPairs.push([a, b]);

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
        candidates.push({
          topic: inferTopic(unit, `${pair[0].context} ${pair[1].context}`),
          docAId: a.id,
          docBId: b.id,
          valueA: pair[0].raw,
          valueB: pair[1].raw,
          detail: `${a.code}: "${pair[0].context}"  ·  ${b.code}: "${pair[1].context}"`,
        });
      }
    }
  }

  if (hasLLM) {
    for (const [a, b] of adjacentPairs.slice(0, MAX_LLM_PAIRS)) {
      candidates.push(...(await llmConflicts(a, b)));
    }
  }

  // Dedup (heuristic + LLM may overlap) and persist.
  const seen = new Set<string>();
  const unique = candidates.filter((c) => {
    const k = key(c);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  await db.conflict.deleteMany({ where: { projectId } });
  const created = [];
  for (const c of unique) {
    created.push(
      await db.conflict.create({
        data: { projectId, status: "OPEN", ...c },
      }),
    );
  }
  return created;
}
