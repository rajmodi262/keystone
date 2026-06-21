import "dotenv/config";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { buildServer } from "./keystone-mcp";

// Entry point an MCP client (e.g. Claude Desktop) launches over stdio.
// All diagnostics MUST go to stderr — stdout is the JSON-RPC channel.
async function main() {
  const server = buildServer();
  await server.connect(new StdioServerTransport());
  console.error("[keystone-mcp] ready on stdio");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
