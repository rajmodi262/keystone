import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { ingestDocument } from "@/server/services/ingest";
import { reviseDocument } from "@/server/services/revise";

const RUN = !!process.env.DATABASE_URL;
const SLUG = "vitest-rev-" + Math.random().toString(36).slice(2, 8);

describe.skipIf(!RUN)("reviseDocument -> blast radius", () => {
  let projectId = "";
  let specId = "";

  beforeAll(async () => {
    const org = await db.organization.create({
      data: {
        name: "Rev Org",
        slug: SLUG,
        projects: { create: { name: "Test", code: "T1" } },
      },
      include: { projects: true },
    });
    projectId = org.projects[0].id;

    const spec = await ingestDocument({
      projectId,
      code: "03 30 00",
      title: "Concrete",
      discipline: "SPEC",
      revision: "C",
      rawText: "Concrete shall achieve 30 MPa per Section 03 30 00. See S-201.",
    });
    specId = spec.id;
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

  it("bumps the revision (C -> D)", async () => {
    const r = await reviseDocument(
      specId,
      "Concrete shall achieve 35 MPa per Section 03 30 00. See S-201.",
    );
    expect(r.revision).toBe("D");
  });

  it("computes a non-empty blast radius (S-201 references the spec)", async () => {
    const r = await reviseDocument(
      specId,
      "Concrete shall achieve 40 MPa per Section 03 30 00. See S-201.",
    );
    expect(r.affectedCount).toBeGreaterThanOrEqual(1);
  });
});
