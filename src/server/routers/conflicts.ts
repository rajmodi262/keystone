import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { assertProjectAccess } from "../lib/access";
import { detectConflicts } from "../services/conflicts";

export const conflictsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertProjectAccess(ctx.db, ctx.user.id, input.projectId);
      return ctx.db.conflict.findMany({
        where: { projectId: input.projectId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          topic: true,
          valueA: true,
          valueB: true,
          detail: true,
          status: true,
          docA: { select: { id: true, code: true, revision: true, title: true } },
          docB: { select: { id: true, code: true, revision: true, title: true } },
        },
      });
    }),

  detect: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertProjectAccess(ctx.db, ctx.user.id, input.projectId);
      const created = await detectConflicts(input.projectId);
      return { count: created.length };
    }),

  setStatus: protectedProcedure
    .input(
      z.object({
        conflictId: z.string(),
        status: z.enum(["OPEN", "RESOLVED", "DISMISSED"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const conflict = await ctx.db.conflict.findUnique({
        where: { id: input.conflictId },
        select: { projectId: true },
      });
      if (!conflict) throw new TRPCError({ code: "NOT_FOUND" });
      await assertProjectAccess(ctx.db, ctx.user.id, conflict.projectId);
      return ctx.db.conflict.update({
        where: { id: input.conflictId },
        data: { status: input.status },
        select: { id: true, status: true },
      });
    }),
});
