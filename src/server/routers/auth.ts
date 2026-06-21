import { z } from "zod";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export const authRouter = createTRPCRouter({
  register: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(80),
        email: z.string().email(),
        password: z.string().min(8).max(100),
        org: z.string().min(1).max(80),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const email = input.email.toLowerCase();
      const existing = await ctx.db.user.findUnique({ where: { email } });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with this email already exists.",
        });
      }
      const passwordHash = await bcrypt.hash(input.password, 10);

      const base = slugify(input.org) || "org";
      let slug = base;
      let n = 1;
      while (await ctx.db.organization.findUnique({ where: { slug } })) {
        slug = `${base}-${n++}`;
      }

      const user = await ctx.db.user.create({
        data: {
          name: input.name,
          email,
          passwordHash,
          memberships: {
            create: {
              role: "OWNER",
              org: { create: { name: input.org, slug } },
            },
          },
        },
        select: { id: true, email: true },
      });

      return { id: user.id, email: user.email };
    }),

  me: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findUnique({
      where: { id: ctx.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        memberships: {
          select: {
            role: true,
            org: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });
  }),
});
