import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { assertOrgAccess, assertOwner } from "../lib/access";

const ROLES = [
  "OWNER",
  "ARCHITECT",
  "ENGINEER",
  "CONTRACTOR",
  "CLIENT",
] as const;

export const membersRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertOrgAccess(ctx.db, ctx.user.id, input.orgId);
      return ctx.db.membership.findMany({
        where: { orgId: input.orgId },
        orderBy: { role: "asc" },
        select: {
          id: true,
          role: true,
          user: { select: { id: true, name: true, email: true } },
        },
      });
    }),

  invite: protectedProcedure
    .input(
      z.object({
        orgId: z.string(),
        email: z.string().email(),
        role: z.enum(ROLES),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertOwner(ctx.db, ctx.user.id, input.orgId);
      const email = input.email.toLowerCase();
      const user = await ctx.db.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No Keystone account with that email — they need to sign up first.",
        });
      }
      const existing = await ctx.db.membership.findUnique({
        where: { userId_orgId: { userId: user.id, orgId: input.orgId } },
        select: { id: true },
      });
      if (existing)
        throw new TRPCError({ code: "CONFLICT", message: "Already a member." });
      await ctx.db.membership.create({
        data: { userId: user.id, orgId: input.orgId, role: input.role },
      });
      return { ok: true };
    }),

  setRole: protectedProcedure
    .input(
      z.object({
        orgId: z.string(),
        userId: z.string(),
        role: z.enum(ROLES),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertOwner(ctx.db, ctx.user.id, input.orgId);
      if (input.userId === ctx.user.id)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You can't change your own role.",
        });
      await ctx.db.membership.update({
        where: { userId_orgId: { userId: input.userId, orgId: input.orgId } },
        data: { role: input.role },
      });
      return { ok: true };
    }),

  remove: protectedProcedure
    .input(z.object({ orgId: z.string(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertOwner(ctx.db, ctx.user.id, input.orgId);
      if (input.userId === ctx.user.id)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You can't remove yourself.",
        });
      await ctx.db.membership.delete({
        where: { userId_orgId: { userId: input.userId, orgId: input.orgId } },
      });
      return { ok: true };
    }),
});
