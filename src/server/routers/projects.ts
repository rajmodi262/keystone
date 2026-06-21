import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { assertOrgAccess, assertProjectAccess } from "../lib/access";

export const projectsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertOrgAccess(ctx.db, ctx.user.id, input.orgId);
      return ctx.db.project.findMany({
        where: { orgId: input.orgId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
          _count: { select: { documents: true, conflicts: true } },
        },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        orgId: z.string(),
        name: z.string().min(1).max(120),
        code: z.string().min(1).max(40),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertOrgAccess(ctx.db, ctx.user.id, input.orgId);
      return ctx.db.project.create({
        data: { orgId: input.orgId, name: input.name, code: input.code },
        select: { id: true, name: true, code: true },
      });
    }),

  get: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { project } = await assertProjectAccess(
        ctx.db,
        ctx.user.id,
        input.projectId,
      );
      return ctx.db.project.findUnique({
        where: { id: project.id },
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
          _count: {
            select: { documents: true, conflicts: true, rfis: true },
          },
        },
      });
    }),
});
