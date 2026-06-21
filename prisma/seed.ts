import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { ingestDocument } from "@/server/services/ingest";
import { detectConflicts } from "@/server/services/conflicts";
import type { Discipline } from "@prisma/client";

const DOCS: Array<{
  code: string;
  title: string;
  discipline: Discipline;
  revision: string;
  rawText: string;
}> = [
  {
    code: "03 30 00",
    title: "Cast-in-Place Concrete",
    discipline: "SPEC",
    revision: "C",
    rawText: `SECTION 03 30 00 — CAST-IN-PLACE CONCRETE

PART 2 — PRODUCTS
2.1 CONCRETE MIXES
Compressive strength: all structural concrete shall achieve a minimum compressive strength of 30 MPa at 28 days. Slump 75-100 mm. Maximum aggregate size 20 mm.

PART 3 — EXECUTION
Placement and curing in accordance with ACI 301. Coordinate foundation pours with drawings S-201 and S-202. Reinforcement schedules are shown on S-201.`,
  },
  {
    code: "S-201",
    title: "Foundation Plan",
    discipline: "STRUCT",
    revision: "A",
    rawText: `DRAWING S-201 — FOUNDATION PLAN

GENERAL NOTES
Note 3: All dimensions in millimetres.
Note 4: Concrete compressive strength 25 MPa unless noted otherwise, per Specification Section 03 30 00.
Note 5: Coordinate equipment pad locations with M-301.

Anchor bolt layout: see detail 5/S-201.`,
  },
  {
    code: "S-202",
    title: "Framing Plan",
    discipline: "STRUCT",
    revision: "B",
    rawText: `DRAWING S-202 — FRAMING PLAN

Structural framing layout. Concrete per Section 03 30 00. Beam schedule on this sheet. Refer to S-201 for the foundation interface.`,
  },
  {
    code: "A-101",
    title: "Level 1 Floor Plan",
    discipline: "ARCH",
    revision: "C",
    rawText: `DRAWING A-101 — LEVEL 1 FLOOR PLAN

Architectural floor plan. Interior finishes per Section 09 91 00. Structural elements coordinate with Section 03 30 00. Partition types on this sheet.`,
  },
  {
    code: "M-301",
    title: "Mechanical Equipment Plan",
    discipline: "MECH",
    revision: "A",
    rawText: `DRAWING M-301 — MECHANICAL EQUIPMENT PLAN

Mechanical equipment layout. Equipment pads and housekeeping pads per structural drawing S-201. Duct routing shown on this sheet.`,
  },
  {
    code: "RFI-14",
    title: "Concrete Compressive Strength",
    discipline: "RFI",
    revision: "open",
    rawText: `RFI-14 — CONCRETE COMPRESSIVE STRENGTH

Question: Specification 03 30 00 calls for 30 MPa concrete, but foundation drawing S-201 Note 4 indicates 25 MPa. Please confirm the governing compressive strength for foundation pours.`,
  },
  {
    code: "RFI-22",
    title: "Anchor Bolt Layout",
    discipline: "RFI",
    revision: "open",
    rawText: `RFI-22 — ANCHOR BOLT LAYOUT

Question: Anchor bolt spacing on drawing S-201 detail 5 appears to conflict with the equipment base shown on M-301. Please clarify the governing layout.`,
  },
  {
    code: "09 91 00",
    title: "Painting",
    discipline: "SPEC",
    revision: "A",
    rawText: `SECTION 09 91 00 — PAINTING

Surface preparation and paint systems for interior and exterior surfaces. Apply in accordance with manufacturer instructions and approved samples.`,
  },
  {
    code: "A-102",
    title: "Reflected Ceiling Plan",
    discipline: "ARCH",
    revision: "A",
    rawText: `DRAWING A-102 — REFLECTED CEILING PLAN

Ceiling grid and finishes. Paint per Section 09 91 00.`,
  },
];

async function main() {
  const email = "demo@keystone.dev";
  const passwordHash = await bcrypt.hash("password123", 10);

  await db.organization.deleteMany({ where: { slug: "riverside-demo" } });

  const user = await db.user.upsert({
    where: { email },
    update: { passwordHash, name: "Demo Architect" },
    create: { email, passwordHash, name: "Demo Architect" },
  });

  const org = await db.organization.create({
    data: {
      name: "Riverside Partners",
      slug: "riverside-demo",
      memberships: { create: { userId: user.id, role: "OWNER" } },
    },
  });

  const project = await db.project.create({
    data: { orgId: org.id, name: "Riverside Hospital — Phase 2", code: "RH-P2" },
  });

  let totalChunks = 0;
  let totalRefs = 0;
  for (const d of DOCS) {
    const r = await ingestDocument({ projectId: project.id, ...d });
    totalChunks += r.chunks;
    totalRefs += r.refs;
    console.log(`  ingested ${d.code.padEnd(9)} chunks=${r.chunks} refs=${r.refs}`);
  }

  const conflicts = await detectConflicts(project.id);

  console.log(
    `\nSeed complete: ${DOCS.length} docs, ${totalChunks} chunks, ${totalRefs} references, ${conflicts.length} conflict(s) detected.`,
  );
  for (const c of conflicts) {
    console.log(`  ⚠ ${c.topic}: ${c.valueA} vs ${c.valueB}`);
  }
  console.log(`Sign in:  demo@keystone.dev  /  password123`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
