import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { assertProjectAccess, assertCanEditProject } from "../lib/access";
import { detectConflicts } from "../services/conflicts";
import {
  classifySeverity,
  recommendGoverning,
  severityRank,
} from "@/lib/precedence";
import { chat, hasLLM } from "@/lib/ai";

export const conflictsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertProjectAccess(ctx.db, ctx.user.id, input.projectId);
      const rows = await ctx.db.conflict.findMany({
        where: { projectId: input.projectId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          topic: true,
          valueA: true,
          valueB: true,
          detail: true,
          status: true,
          docA: {
            select: { id: true, code: true, revision: true, title: true, discipline: true },
          },
          docB: {
            select: { id: true, code: true, revision: true, title: true, discipline: true },
          },
        },
      });

      // Enrich each conflict with severity + AEC governing recommendation.
      const enriched = rows.map((c) => {
        const severity = classifySeverity(
          c.topic,
          c.docA.discipline,
          c.docB.discipline,
        );
        const rec = recommendGoverning(
          { code: c.docA.code, discipline: c.docA.discipline, revision: c.docA.revision },
          { code: c.docB.code, discipline: c.docB.discipline, revision: c.docB.revision },
        );
        return { ...c, severity, ...rec };
      });

      // Most dangerous first; open before resolved.
      enriched.sort((a, b) => {
        if (a.status !== b.status) return a.status === "OPEN" ? -1 : 1;
        return severityRank(b.severity) - severityRank(a.severity);
      });
      return enriched;
    }),

  detect: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertCanEditProject(ctx.db, ctx.user.id, input.projectId);
      const created = await detectConflicts(input.projectId);
      return { count: created.length };
    }),

  // On-demand LLM explanation + recommended action for one conflict.
  explain: protectedProcedure
    .input(z.object({ conflictId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const c = await ctx.db.conflict.findUnique({
        where: { id: input.conflictId },
        select: {
          projectId: true,
          topic: true,
          valueA: true,
          valueB: true,
          docA: { select: { code: true, discipline: true, revision: true, rawText: true } },
          docB: { select: { code: true, discipline: true, revision: true, rawText: true } },
        },
      });
      if (!c) throw new TRPCError({ code: "NOT_FOUND" });
      await assertProjectAccess(ctx.db, ctx.user.id, c.projectId);

      const rec = recommendGoverning(
        { code: c.docA.code, discipline: c.docA.discipline, revision: c.docA.revision },
        { code: c.docB.code, discipline: c.docB.discipline, revision: c.docB.revision },
      );

      if (!hasLLM) {
        return {
          explanation: `${c.topic}: ${c.docA.code} states ${c.valueA}, ${c.docB.code} states ${c.valueB}. ${rec.rationale}`,
        };
      }

      const text = await chat(
        "You are a senior AEC coordinator. In 2-3 sentences, explain the practical risk of the contradiction and recommend the next action. Be concrete and concise.",
        `Contradiction on "${c.topic}".
Document A — ${c.docA.code} (${c.docA.discipline}, Rev ${c.docA.revision}): ${c.valueA}
Excerpt: ${(c.docA.rawText ?? "").slice(0, 800)}

Document B — ${c.docB.code} (${c.docB.discipline}, Rev ${c.docB.revision}): ${c.valueB}
Excerpt: ${(c.docB.rawText ?? "").slice(0, 800)}

Standard precedence suggests: ${rec.rationale}`,
      );
      return { explanation: text || rec.rationale };
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
      await assertCanEditProject(ctx.db, ctx.user.id, conflict.projectId);
      return ctx.db.conflict.update({
        where: { id: input.conflictId },
        data: { status: input.status },
        select: { id: true, status: true },
      });
    }),
});
