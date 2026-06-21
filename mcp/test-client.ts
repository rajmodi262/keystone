import "dotenv/config";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildServer } from "./keystone-mcp";

function firstText(result: unknown): string {
  const content = (result as { content?: Array<{ text?: string }> }).content;
  return content?.[0]?.text ?? "";
}

async function main() {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = buildServer();
  await server.connect(serverTransport);

  const client = new Client({ name: "keystone-test", version: "1.0.0" });
  await client.connect(clientTransport);

  const tools = await client.listTools();
  console.log("tools:", tools.tools.map((t) => t.name).join(", "));

  const projects = JSON.parse(
    firstText(await client.callTool({ name: "list_projects", arguments: {} })),
  );
  const projectId = projects[0]?.id;
  console.log(`project: ${projects[0]?.name} (${projectId})`);

  const ask = JSON.parse(
    firstText(
      await client.callTool({
        name: "ask_project",
        arguments: {
          projectId,
          question: "What concrete strength is required?",
        },
      }),
    ),
  );
  console.log(
    "ask_project ->",
    ask.type === "conflict"
      ? `CONFLICT ${ask.sources[0].value} vs ${ask.sources[1].value}`
      : ask.answer?.slice(0, 60),
  );

  const search = JSON.parse(
    firstText(
      await client.callTool({
        name: "search_documents",
        arguments: { projectId, query: "anchor bolt layout", k: 3 },
      }),
    ),
  );
  console.log(
    "search_documents ->",
    search.map((r: { code: string; score: number }) => `${r.code}(${r.score.toFixed(2)})`).join(", "),
  );

  const conflicts = JSON.parse(
    firstText(
      await client.callTool({ name: "list_conflicts", arguments: { projectId } }),
    ),
  );
  console.log("list_conflicts ->", conflicts.length, "found");

  await client.close();
  await server.close();
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
