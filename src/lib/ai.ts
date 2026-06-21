import OpenAI from "openai";

export const EMBED_DIM = 1536;

const apiKey = process.env.OPENAI_API_KEY?.trim();
const baseURL = process.env.OPENAI_BASE_URL?.trim() || "";
export const hasLLM = !!apiKey;

const client = hasLLM
  ? new OpenAI({ apiKey, baseURL: baseURL || undefined })
  : null;

// Groq is OpenAI-compatible for chat but has NO /embeddings endpoint, so when
// pointed at Groq we keep the deterministic local embedder for vector search
// and use the remote provider only for the LLM (conflict detection, answers).
const supportsRemoteEmbeddings = !!client && !/groq\.com/i.test(baseURL);
export const aiMode = hasLLM ? "llm" : "local";
export const embedMode = supportsRemoteEmbeddings ? "remote" : "local";

// Deterministic, offline embedding: hashed bag-of-words -> L2-normalized vector.
// Lets the whole app run with ZERO API keys; swap in a real provider by setting
// OPENAI_API_KEY. Same dimension either way so the pgvector column never changes.
function localEmbed(text: string): number[] {
  const v = new Array(EMBED_DIM).fill(0);
  const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  for (const tok of tokens) {
    let h = 2166136261;
    for (let i = 0; i < tok.length; i++) {
      h ^= tok.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    v[Math.abs(h) % EMBED_DIM] += 1;
    v[Math.abs(Math.imul(h, 2654435761)) % EMBED_DIM] += 0.5;
  }
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}

export async function embed(texts: string[]): Promise<number[][]> {
  if (!client || !supportsRemoteEmbeddings) return texts.map(localEmbed);
  const res = await client.embeddings.create({
    model: process.env.EMBED_MODEL || "text-embedding-3-small",
    input: texts,
  });
  return res.data.map((d) => d.embedding as number[]);
}

// Returns "" when no LLM configured; callers fall back to heuristics.
export async function chat(
  system: string,
  user: string,
  temperature = 0.1,
): Promise<string> {
  if (!client) return "";
  const res = await client.chat.completions.create({
    model: process.env.LLM_MODEL || "gpt-4o-mini",
    temperature,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return res.choices[0]?.message?.content ?? "";
}

export function toVectorLiteral(vec: number[]): string {
  return "[" + vec.map((x) => Number(x.toFixed(6))).join(",") + "]";
}
