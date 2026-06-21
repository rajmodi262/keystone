import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { db } from "@/lib/db";
import { embed, toVectorLiteral } from "@/lib/ai";
import { answerQuestion } from "@/server/services/ask";

function text(obj: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: typeof obj === "string" ? obj : JSON.stringify(obj, null, 2),
      },
    ],
  };
}

// Builds the Keystone MCP server: exposes the project's tools to any MCP client
// (Claude Desktop, etc.) so an AI assistant can query the document graph directly.
export function buildServer() {
  const server = new McpServer({ name: "keystone", version: "1.0.0" });

  server.registerTool(
    "list_projects",
    { description: "List AEC projects available in Keystone." },
    async () => {
      const rows = await db.project.findMany({
        select: { id: true, name: true, code: true },
      });
      return text(rows);
    },
  );

  server.registerTool(
    "list_documents",
    {
      description: "List documents (drawings, specs, RFIs) in a project.",
      inputSchema: { projectId: z.string() },
    },
    async ({ projectId }) => {
      const rows = await db.document.findMany({
        where: { projectId },
        orderBy: { code: "asc" },
        select: { code: true, title: true, discipline: true, revision: true },
      });
      return text(rows);
    },
  );

  server.registerTool(
    "search_documents",
    {
      description:
        "Semantic search across a project's documents. Returns the most relevant passages with citations.",
      inputSchema: {
        projectId: z.string(),
        query: z.string(),
        k: z.number().int().min(1).max(10).optional(),
      },
    },
    async ({ projectId, query, k }) => {
      const [qv] = await embed([query]);
      const lit = toVectorLiteral(qv);
      const rows = await db.$queryRaw<
        Array<{ code: string; revision: string; content: string; score: number }>
      >`
        SELECT d.code, d.revision, c.content,
               1 - (c.embedding <=> ${lit}::vector) AS score
        FROM "DocumentChunk" c
        JOIN "Document" d ON d.id = c."documentId"
        WHERE d."projectId" = ${projectId} AND c.embedding IS NOT NULL
        ORDER BY c.embedding <=> ${lit}::vector
        LIMIT ${k ?? 5}`;
      return text(
        rows.map((r) => ({
          code: r.code,
          revision: r.revision,
          score: Number(r.score),
          snippet: r.content.replace(/\s+/g, " ").slice(0, 200),
        })),
      );
    },
  );

  server.registerTool(
    "ask_project",
    {
      description:
        "Ask a question across a project's documents. Surfaces contradictions between documents instead of a single confident answer.",
      inputSchema: { projectId: z.string(), question: z.string() },
    },
    async ({ projectId, question }) => {
      return text(await answerQuestion(projectId, question));
    },
  );

  server.registerTool(
    "list_conflicts",
    {
      description: "List detected contradictions in a project.",
      inputSchema: { projectId: z.string() },
    },
    async ({ projectId }) => {
      const rows = await db.conflict.findMany({
        where: { projectId },
        select: {
          topic: true,
          valueA: true,
          valueB: true,
          status: true,
          docA: { select: { code: true } },
          docB: { select: { code: true } },
        },
      });
      return text(rows);
    },
  );

  return server;
}
