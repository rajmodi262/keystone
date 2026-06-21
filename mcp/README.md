# Keystone MCP server

Exposes Keystone's project intelligence to any [Model Context Protocol](https://modelcontextprotocol.io)
client (Claude Desktop, IDE agents, etc.) so an AI assistant can query the
document graph directly.

## Tools

| Tool | Description |
|------|-------------|
| `list_projects` | List AEC projects |
| `list_documents` | List documents in a project |
| `search_documents` | Semantic (pgvector) search returning cited passages |
| `ask_project` | Conflict-aware Q&A — surfaces contradictions, not a single answer |
| `list_conflicts` | List detected contradictions |

## Run

```bash
npm run mcp        # start the server over stdio
npm run mcp:test   # in-process smoke test (lists tools, asks a question)
```

## Register with Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "keystone": {
      "command": "npx",
      "args": ["tsx", "mcp/server.ts"],
      "cwd": "D:/RajFiles/keystone"
    }
  }
}
```

The server reads `DATABASE_URL` from `.env`. Diagnostics are written to stderr so
they never corrupt the JSON-RPC stream on stdout.
