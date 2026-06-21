import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { assertProjectAccess, assertCanEditProject } from "../lib/access";

export const rfiRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertProjectAccess(ctx.db, ctx.user.id, input.projectId);
      return ctx.db.rfi.findMany({
        where: { projectId: input.projectId },
        orderBy: { number: "desc" },
        select: {
          id: true,
          number: true,
          question: true,
          answer: true,
          status: true,
          createdAt: true,
        },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        question: z.string().min(3).max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertCanEditProject(ctx.db, ctx.user.id, input.projectId);
      const last = await ctx.db.rfi.findFirst({
        where: { projectId: input.projectId },
        orderBy: { number: "desc" },
        select: { number: true },
      });
      const number = (last?.number ?? 0) + 1;
      return ctx.db.rfi.create({
        data: {
          projectId: input.projectId,
          number,
          question: input.question,
          status: "OPEN",
        },
        select: { id: true, number: true },
      });
    }),

  answer: protectedProcedure
    .input(z.object({ rfiId: z.string(), answer: z.string().min(1).max(4000) }))
    .mutation(async ({ ctx, input }) => {
      const rfi = await ctx.db.rfi.findUnique({
        where: { id: input.rfiId },
        select: { projectId: true },
      });
      if (!rfi) throw new TRPCError({ code: "NOT_FOUND" });
      await assertCanEditProject(ctx.db, ctx.user.id, rfi.projectId);
      return ctx.db.rfi.update({
        where: { id: input.rfiId },
        data: { answer: input.answer, status: "ANSWERED" },
        select: { id: true, status: true },
      });
    }),

  setStatus: protectedProcedure
    .input(
      z.object({
        rfiId: z.string(),
        status: z.enum(["OPEN", "ANSWERED", "CLOSED"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const rfi = await ctx.db.rfi.findUnique({
        where: { id: input.rfiId },
        select: { projectId: true },
      });
      if (!rfi) throw new TRPCError({ code: "NOT_FOUND" });
      await assertCanEditProject(ctx.db, ctx.user.id, rfi.projectId);
      return ctx.db.rfi.update({
        where: { id: input.rfiId },
        data: { status: input.status },
        select: { id: true, status: true },
      });
    }),
});
