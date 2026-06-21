# Keystone — Architecture & How It Works

A guide to the system: the request lifecycle, how the two novel features actually
work, the data model, and the honest limitations. If you can explain this page,
you can explain the codebase.

## Stack & why

- **Next.js 14 (App Router)** — one codebase for UI + API. Server Components fetch
  with the DB directly; Client Components talk to the API via tRPC.
- **tRPC** — end-to-end typesafe RPC. The client calls `api.documents.graph.useQuery(...)`
  and the types come straight from the server router — no hand-written API types.
- **Prisma + PostgreSQL + pgvector** — relational data + vector similarity in one DB.
- **NextAuth (Credentials + JWT)** — multi-tenant auth; `Membership.role` is the RBAC.
- **Groq (LLM) + local/Jina (embeddings)** — see "AI layer".
- **Vercel + Neon** — serverless app + serverless Postgres. Deploy on `git push`.

## Request lifecycle (the thing to be able to draw)

1. A Client Component calls a tRPC hook, e.g. `api.conflicts.list.useQuery({ projectId })`.
2. It hits `src/app/api/trpc/[trpc]/route.ts` (the fetch adapter) which builds a
   **context** (`src/server/context.ts`: `{ db, session }` from `getServerSession`).
3. The matching procedure in `src/server/routers/conflicts.ts` runs. `protectedProcedure`
   (`src/server/trpc.ts`) first throws `UNAUTHORIZED` if there's no session.
4. The procedure calls `assertProjectAccess` (`src/server/lib/access.ts`) — the row-level
   security check: is this user a member of the project's org?
5. It queries via Prisma (or raw SQL for vectors), shapes the result, returns it.
   Types flow back to the client automatically.

## Data model (`prisma/schema.prisma`)

`Organization → Membership(role) → User` is the tenancy + RBAC spine.
`Project → Document → DocumentChunk(embedding vector)`. `Reference` rows are the
**graph edges** (`fromDoc` references `toCode`, resolved to `toDoc`). `Conflict`
links two documents. `Rfi` is the workflow model.

## Novelty 1 — Conflict-aware RAG

Generic RAG returns one confident answer from the top chunk. In construction that's
dangerous: the top chunk may be contradicted by another document. The pipeline
(`src/server/services/ask.ts`):

1. Embed the question (`src/lib/ai.ts → embed`).
2. **Vector search** over `DocumentChunk.embedding` with pgvector cosine distance
   (`<=>`) via `$queryRaw` — top 6 chunks.
3. **Claim clustering** (`src/lib/claims.ts`): extract `value + unit` claims from the
   retrieved chunks (regex over MPa/mm/hr/etc.), group by unit.
4. If two *different documents* assert *different values* for the same unit → return a
   **conflict** instead of an answer, with both sources.
5. Enrich with **severity** + **governing recommendation** (`src/lib/precedence.ts`).
6. No conflict → an LLM answer grounded in the retrieved context, with citations
   (or an extractive fallback if no LLM key).

Standalone detection (`src/server/services/conflicts.ts`) does the same over the whole
project: for **graph-adjacent** document pairs, compare same-unit claims; optionally a
Groq LLM pass catches *textual* contradictions a regex can't. Requiring an edge keeps
precision high.

### Precedence (`src/lib/precedence.ts`) — the domain logic

- **Severity**: structural/fire/load → CRITICAL; dimensions/anchors → HIGH; finishes → LOW.
- **Governing document** (standard AEC order of precedence): the more current
  revision supersedes; otherwise the specification governs the drawing. Pure and
  deterministic — fully explainable, no black box.

## Novelty 2 — Change-impact "blast radius"

Documents reference each other (`S-201` → "per Spec `03 30 00`"), extracted by
`src/lib/refs.ts` into `Reference` edges. When you revise a document
(`src/server/services/revise.ts`): replace its text → re-derive edges + embeddings →
recompute conflicts → **reverse-BFS** over the edges to find every document that
transitively references it = the blast radius. The graph (`impact-graph.tsx`, laid out
with **dagre**) animates the wave outward from the revised node.

## AI layer (`src/lib/ai.ts`)

- **LLM** (answers, explanations, textual conflict pass): OpenAI-compatible client
  pointed at **Groq** (`llama-3.3-70b`). Returns `""` when no key → callers fall back.
- **Embeddings**: a remote provider when configured, else a deterministic **local**
  embedder so the app runs with zero keys. (Groq has no embeddings endpoint, so the
  embedder is independent of the LLM provider.)

## Honest limitations (say these before they're asked)

- Conflict detection is strongest on numeric value/unit disagreements between
  graph-adjacent documents; the LLM textual pass widens recall but is probabilistic.
- No OCR yet — scanned (image-only) PDFs need text extraction first.
- Validated primarily on a seeded demo project; not yet load-tested at hundreds of docs.
- The in-memory rate limiter is per-instance (fine for one instance; use Redis at scale).

## Run it

```bash
npm run db:up && npm run db:migrate && npm run db:seed && npm run dev
npm test            # unit
npm run test:all    # + integration (needs DB)
npm run mcp:test    # MCP server smoke test
```
