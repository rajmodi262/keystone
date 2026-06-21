import { db } from "@/lib/db";
import { embed, toVectorLiteral } from "@/lib/ai";
import { chunkText } from "@/lib/chunk";
import { extractRefs } from "@/lib/refs";
import { detectConflicts } from "./conflicts";

function bumpRevision(rev: string): string {
  if (/^[A-Za-z]$/.test(rev)) {
    return String.fromCharCode(rev.toUpperCase().charCodeAt(0) + 1);
  }
  const n = parseInt(rev, 10);
  if (!Number.isNaN(n)) return String(n + 1);
  return rev;
}

// Revise an existing document in place: replace its text, re-derive its graph
// edges + embeddings, recompute conflicts, and return the downstream blast
// radius (every doc that transitively references this one).
export async function reviseDocument(
  documentId: string,
  rawText: string,
  revision?: string,
) {
  const doc = await db.document.findUnique({
    where: { id: documentId },
    select: { id: true, projectId: true, code: true, revision: true },
  });
  if (!doc) throw new Error("Document not found");

  const newRevision = revision?.trim() || bumpRevision(doc.revision);

  // Replace the document's derived data.
  await db.documentChunk.deleteMany({ where: { documentId } });
  await db.reference.deleteMany({ where: { fromDocId: documentId } });
  await db.document.update({
    where: { id: documentId },
    data: { rawText, revision: newRevision },
  });

  // Outgoing references -> edges.
  const codes = extractRefs(rawText, doc.code);
  if (codes.length) {
    const targets = await db.document.findMany({
      where: { projectId: doc.projectId, code: { in: codes } },
      select: { id: true, code: true },
    });
    const byCode = new Map(targets.map((t) => [t.code.toUpperCase(), t.id]));
    await db.reference.createMany({
      data: codes.map((c) => ({
        projectId: doc.projectId,
        fromDocId: documentId,
        toCode: c,
        toDocId: byCode.get(c.toUpperCase()) ?? null,
      })),
    });
  }

  // Re-chunk + embed.
  const chunks = chunkText(rawText);
  if (chunks.length) {
    const vectors = await embed(chunks);
    for (let i = 0; i < chunks.length; i++) {
      const row = await db.documentChunk.create({
        data: { documentId, idx: i, content: chunks[i] },
        select: { id: true },
      });
      await db.$executeRaw`UPDATE "DocumentChunk" SET embedding = ${toVectorLiteral(
        vectors[i],
      )}::vector WHERE id = ${row.id}`;
    }
  }

  const conflicts = await detectConflicts(doc.projectId);

  // Blast radius: reverse-BFS from this document over resolved references.
  const edges = await db.reference.findMany({
    where: { projectId: doc.projectId, toDocId: { not: null } },
    select: { fromDocId: true, toDocId: true },
  });
  const revAdj = new Map<string, string[]>();
  for (const e of edges) {
    if (!e.toDocId) continue;
    const arr = revAdj.get(e.toDocId) ?? [];
    arr.push(e.fromDocId);
    revAdj.set(e.toDocId, arr);
  }
  const affected = new Set<string>();
  const seen = new Set<string>([documentId]);
  let layer = [documentId];
  while (layer.length) {
    const next: string[] = [];
    for (const p of layer) {
      for (const c of revAdj.get(p) ?? []) {
        if (!seen.has(c)) {
          seen.add(c);
          affected.add(c);
          next.push(c);
        }
      }
    }
    layer = next;
  }

  return {
    documentId,
    code: doc.code,
    revision: newRevision,
    affected: Array.from(affected),
    affectedCount: affected.size,
    conflicts: conflicts.length,
  };
}
