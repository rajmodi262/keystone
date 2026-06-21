import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { assertProjectAccess } from "../lib/access";
import { answerQuestion } from "../services/ask";
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
      await assertProjectAccess(ctx.db, ctx.user.id, input.projectId);
      return answerQuestion(input.projectId, input.question);
    }),
});
