import { createTRPCRouter, publicProcedure } from "../trpc";
import { authRouter } from "./auth";
import { projectsRouter } from "./projects";
import { documentsRouter } from "./documents";
import { conflictsRouter } from "./conflicts";
import { aiRouter } from "./ai";

export const appRouter = createTRPCRouter({
  health: publicProcedure.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  projects: projectsRouter,
  documents: documentsRouter,
  conflicts: conflictsRouter,
  ai: aiRouter,
});

export type AppRouter = typeof appRouter;
