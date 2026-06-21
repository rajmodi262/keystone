import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { assertProjectAccess } from "../lib/access";
import { ingestDocument } from "../services/ingest";

const disciplines = [
  "ARCH",
  "STRUCT",
  "MECH",
  "ELEC",
  "CIVIL",
  "SPEC",
  "RFI",
  "OTHER",
] as const;

export const documentsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertProjectAccess(ctx.db, ctx.user.id, input.projectId);
      return ctx.db.document.findMany({
        where: { projectId: input.projectId },
        orderBy: { code: "asc" },
        select: {
          id: true,
          code: true,
          title: true,
          discipline: true,
          revision: true,
          createdAt: true,
          _count: { select: { chunks: true, refsOut: true, refsIn: true } },
        },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        code: z.string().min(1).max(40),
        title: z.string().min(1).max(200),
        discipline: z.enum(disciplines),
        revision: z.string().max(20).optional(),
        rawText: z.string().min(1),
        fileName: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertProjectAccess(ctx.db, ctx.user.id, input.projectId);
      return ingestDocument(input);
    }),

  get: protectedProcedure
    .input(z.object({ documentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const doc = await ctx.db.document.findUnique({
        where: { id: input.documentId },
        select: {
          id: true,
          projectId: true,
          code: true,
          title: true,
          discipline: true,
          revision: true,
          rawText: true,
          refsOut: { select: { toCode: true, toDocId: true } },
        },
      });
      if (!doc) return null;
      await assertProjectAccess(ctx.db, ctx.user.id, doc.projectId);
      return doc;
    }),

  // Nodes + edges for the project dependency graph (drives the impact view).
  graph: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertProjectAccess(ctx.db, ctx.user.id, input.projectId);
      const [nodes, edges] = await Promise.all([
        ctx.db.document.findMany({
          where: { projectId: input.projectId },
          select: {
            id: true,
            code: true,
            title: true,
            discipline: true,
            revision: true,
          },
        }),
        ctx.db.reference.findMany({
          where: { projectId: input.projectId, toDocId: { not: null } },
          select: { fromDocId: true, toDocId: true },
        }),
      ]);
      return { nodes, edges };
    }),
});
