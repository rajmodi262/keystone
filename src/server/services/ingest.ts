import type { Discipline } from "@prisma/client";
import { db } from "@/lib/db";
import { embed, toVectorLiteral } from "@/lib/ai";
import { chunkText } from "@/lib/chunk";
import { extractRefs } from "@/lib/refs";

export interface IngestInput {
  projectId: string;
  code: string;
  title: string;
  discipline: Discipline;
  revision?: string;
  rawText: string;
  fileName?: string;
}

// Create a document, wire it into the project dependency graph, and embed it.
export async function ingestDocument(input: IngestInput) {
  const doc = await db.document.create({
    data: {
      projectId: input.projectId,
      code: input.code,
      title: input.title,
      discipline: input.discipline,
      revision: input.revision ?? "A",
      rawText: input.rawText,
      fileName: input.fileName,
    },
    select: { id: true },
  });

  // 1) Outgoing references -> graph edges (resolve to existing docs by code).
  const codes = extractRefs(input.rawText, input.code);
  if (codes.length) {
    const targets = await db.document.findMany({
      where: { projectId: input.projectId, code: { in: codes } },
      select: { id: true, code: true },
    });
    const byCode = new Map(targets.map((t) => [t.code.toUpperCase(), t.id]));
    await db.reference.createMany({
      data: codes.map((c) => ({
        projectId: input.projectId,
        fromDocId: doc.id,
        toCode: c,
        toDocId: byCode.get(c.toUpperCase()) ?? null,
      })),
    });
  }

  // 2) Back-resolve: edges from earlier docs that pointed at THIS doc's code.
  await db.reference.updateMany({
    where: {
      projectId: input.projectId,
      toDocId: null,
      toCode: { equals: input.code, mode: "insensitive" },
    },
    data: { toDocId: doc.id },
  });

  // 3) Chunk -> embed -> store vectors (pgvector via raw SQL).
  const chunks = chunkText(input.rawText);
  if (chunks.length) {
    const vectors = await embed(chunks);
    for (let i = 0; i < chunks.length; i++) {
      const row = await db.documentChunk.create({
        data: { documentId: doc.id, idx: i, content: chunks[i] },
        select: { id: true },
      });
      await db.$executeRaw`UPDATE "DocumentChunk" SET embedding = ${toVectorLiteral(
        vectors[i],
      )}::vector WHERE id = ${row.id}`;
    }
  }

  return { id: doc.id, chunks: chunks.length, refs: codes.length };
}
