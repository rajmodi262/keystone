import { createTRPCRouter, publicProcedure } from "../trpc";
import { authRouter } from "./auth";
import { projectsRouter } from "./projects";
import { documentsRouter } from "./documents";
import { conflictsRouter } from "./conflicts";
import { aiRouter } from "./ai";
import { membersRouter } from "./members";
import { rfiRouter } from "./rfi";

export const appRouter = createTRPCRouter({
  health: publicProcedure.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  projects: projectsRouter,
  documents: documentsRouter,
  conflicts: conflictsRouter,
  ai: aiRouter,
  members: membersRouter,
  rfi: rfiRouter,
});

export type AppRouter = typeof appRouter;
