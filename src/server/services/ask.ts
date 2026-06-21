import { db } from "@/lib/db";
import { embed, toVectorLiteral, chat, hasLLM } from "@/lib/ai";
import { extractClaims, inferTopic } from "@/lib/claims";
import {
  classifySeverity,
  recommendGoverning,
  type Severity,
} from "@/lib/precedence";

export interface Citation {
  documentId: string;
  code: string;
  title: string;
  revision: string;
  score: number;
  snippet: string;
}

type RetrievedRow = {
  id: string;
  content: string;
  documentId: string;
  code: string;
  title: string;
  revision: string;
  discipline: string;
  score: number;
};

export type AskResult =
  | {
      type: "conflict";
      topic: string;
      severity: Severity;
      governingCode: string | null;
      rationale: string;
      sources: { code: string; revision: string; value: string; context: string }[];
      citations: Citation[];
    }
  | { type: "answer"; answer: string; citations: Citation[] };

export async function answerQuestion(
  projectId: string,
  question: string,
): Promise<AskResult> {
  const [qvec] = await embed([question]);
  const lit = toVectorLiteral(qvec);

  // Hybrid retrieval: vector similarity (pgvector) + lexical relevance (Postgres
  // full-text), fused with Reciprocal Rank Fusion. The lexical signal catches
  // exact terms/codes the embedding may miss, and vice-versa.
  const [vec, lex] = await Promise.all([
    db.$queryRaw<RetrievedRow[]>`
      SELECT c.id, c.content, c."documentId", d.code, d.title, d.revision,
             d.discipline::text AS discipline,
             1 - (c.embedding <=> ${lit}::vector) AS score
      FROM "DocumentChunk" c
      JOIN "Document" d ON d.id = c."documentId"
      WHERE d."projectId" = ${projectId} AND c.embedding IS NOT NULL
      ORDER BY c.embedding <=> ${lit}::vector
      LIMIT 10`,
    db.$queryRaw<RetrievedRow[]>`
      SELECT c.id, c.content, c."documentId", d.code, d.title, d.revision,
             d.discipline::text AS discipline,
             ts_rank(to_tsvector('english', c.content), plainto_tsquery('english', ${question})) AS score
      FROM "DocumentChunk" c
      JOIN "Document" d ON d.id = c."documentId"
      WHERE d."projectId" = ${projectId}
        AND to_tsvector('english', c.content) @@ plainto_tsquery('english', ${question})
      ORDER BY score DESC
      LIMIT 10`,
  ]);

  const K = 60; // RRF dampening constant
  const fused = new Map<
    string,
    { row: RetrievedRow; vscore: number; rrf: number }
  >();
  const add = (list: RetrievedRow[], isVector: boolean) =>
    list.forEach((r, i) => {
      const e = fused.get(r.id) ?? { row: r, vscore: 0, rrf: 0 };
      if (isVector) e.vscore = Number(r.score);
      e.rrf += 1 / (K + i + 1);
      fused.set(r.id, e);
    });
  add(vec, true);
  add(lex, false);

  const rows: RetrievedRow[] = Array.from(fused.values())
    .sort((a, b) => b.rrf - a.rrf)
    .slice(0, 6)
    .map((e) => ({ ...e.row, score: e.vscore || Number(e.row.score) }));

  const citations: Citation[] = rows.map((r) => ({
    documentId: r.documentId,
    code: r.code,
    title: r.title,
    revision: r.revision,
    score: Number(r.score),
    snippet: r.content.replace(/\s+/g, " ").slice(0, 160),
  }));

  // Conflict-aware step: cluster numeric claims across the retrieved evidence.
  // Authoritative docs only (RFIs restate the conflict, so they're excluded).
  type Hit = {
    code: string;
    revision: string;
    discipline: string;
    documentId: string;
    value: number;
    raw: string;
    context: string;
    unitKey: string;
  };
  const hits: Hit[] = [];
  for (const r of rows) {
    if (r.discipline === "RFI") continue;
    for (const cl of extractClaims(r.content)) {
      hits.push({
        code: r.code,
        revision: r.revision,
        discipline: r.discipline,
        documentId: r.documentId,
        value: cl.value,
        raw: cl.raw,
        context: cl.context,
        unitKey: cl.unitKey,
      });
    }
  }

  const byUnit = new Map<string, Hit[]>();
  for (const h of hits) {
    const arr = byUnit.get(h.unitKey) ?? [];
    arr.push(h);
    byUnit.set(h.unitKey, arr);
  }

  for (const [unit, arr] of Array.from(byUnit.entries())) {
    const docs = new Set(arr.map((h) => h.documentId));
    const vals = new Set(arr.map((h) => h.value));
    if (docs.size >= 2 && vals.size >= 2) {
      let a: Hit | null = null;
      let b: Hit | null = null;
      for (const x of arr) {
        for (const y of arr) {
          if (x.documentId !== y.documentId && x.value !== y.value) {
            a = x;
            b = y;
            break;
          }
        }
        if (a) break;
      }
      if (a && b) {
        const topic = inferTopic(unit, `${a.context} ${b.context}`);
        const rec = recommendGoverning(
          { code: a.code, discipline: a.discipline, revision: a.revision },
          { code: b.code, discipline: b.discipline, revision: b.revision },
        );
        return {
          type: "conflict",
          topic,
          severity: classifySeverity(topic, a.discipline, b.discipline),
          governingCode: rec.governingCode,
          rationale: rec.rationale,
          sources: [
            { code: a.code, revision: a.revision, value: a.raw, context: a.context },
            { code: b.code, revision: b.revision, value: b.raw, context: b.context },
          ],
          citations,
        };
      }
    }
  }

  // No contradiction -> a normal cited answer (LLM if configured, else extractive).
  let answer: string;
  if (hasLLM) {
    const context = rows
      .map((r) => `[${r.code} Rev ${r.revision}] ${r.content}`)
      .join("\n\n");
    answer =
      (await chat(
        "You are Keystone, an AEC document assistant. Answer ONLY from the provided context and cite document codes in square brackets like [S-201]. If the context does not answer the question, say so plainly.",
        `Context:\n${context}\n\nQuestion: ${question}`,
      )) ||
      (rows[0]
        ? `Based on ${rows[0].code}: ${rows[0].content.slice(0, 280)}`
        : "No relevant documents found.");
  } else {
    answer = rows.length
      ? `Based on ${rows[0].code} (Rev ${rows[0].revision}): ${rows[0].content
          .replace(/\s+/g, " ")
          .slice(0, 280)}…`
      : "No relevant documents found.";
  }

  return { type: "answer", answer, citations };
}
