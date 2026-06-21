import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { assertProjectAccess } from "../lib/access";
import { answerQuestion } from "../services/ask";
import { rateLimit } from "../lib/ratelimit";
import { aiMode } from "@/lib/ai";

export const aiRouter = createTRPCRouter({
  mode: protectedProcedure.query(() => ({ mode: aiMode })),

  ask: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        question: z.string().min(2).max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!rateLimit(`ask:${ctx.user.id}`, 20, 60_000)) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many questions — give it a minute.",
        });
      }
      await assertProjectAccess(ctx.db, ctx.user.id, input.projectId);
      return answerQuestion(input.projectId, input.question);
    }),
});
