import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { ingestDocument } from "@/server/services/ingest";
import { detectConflicts } from "@/server/services/conflicts";
import { answerQuestion } from "@/server/services/ask";

// Runs only when a database is reachable (local dev / CI with a PG service).
const RUN = !!process.env.DATABASE_URL;
const SLUG = "vitest-" + Math.random().toString(36).slice(2, 8);

describe.skipIf(!RUN)("ingest -> graph -> conflict -> ask", () => {
  let projectId = "";

  beforeAll(async () => {
    const org = await db.organization.create({
      data: {
        name: "Vitest Org",
        slug: SLUG,
        projects: { create: { name: "Test", code: "T1" } },
      },
      include: { projects: true },
    });
    projectId = org.projects[0].id;

    await ingestDocument({
      projectId,
      code: "03 30 00",
      title: "Concrete",
      discipline: "SPEC",
      revision: "C",
      rawText: "Concrete shall achieve 30 MPa per Section 03 30 00. See S-201.",
    });
    await ingestDocument({
      projectId,
      code: "S-201",
      title: "Foundation",
      discipline: "STRUCT",
      revision: "A",
      rawText: "Concrete compressive strength 25 MPa per Section 03 30 00.",
    });
  });

  afterAll(async () => {
    await db.organization.deleteMany({ where: { slug: SLUG } });
    await db.$disconnect();
  });

  it("builds resolved graph edges", async () => {
    const edges = await db.reference.count({
      where: { projectId, toDocId: { not: null } },
    });
    expect(edges).toBeGreaterThan(0);
  });

  it("writes embeddings to pgvector", async () => {
    const rows = await db.$queryRaw<{ count: number }[]>`
      SELECT count(*)::int AS count
      FROM "DocumentChunk" c JOIN "Document" d ON d.id = c."documentId"
      WHERE d."projectId" = ${projectId} AND c.embedding IS NOT NULL`;
    expect(Number(rows[0].count)).toBeGreaterThan(0);
  });

  it("detects the 30-vs-25 MPa contradiction", async () => {
    const conflicts = await detectConflicts(projectId);
    expect(conflicts.length).toBeGreaterThanOrEqual(1);
  });

  it("surfaces the conflict when asked", async () => {
    const res = await answerQuestion(projectId, "What concrete strength is required?");
    expect(res.type).toBe("conflict");
  });
});
