import { describe, it, expect } from "vitest";
import { embed, EMBED_DIM, aiMode } from "@/lib/ai";

// These assert properties of the built-in local embedder (no API key).
describe.skipIf(aiMode !== "local")("local embedder", () => {
  it("produces fixed-dimension vectors", async () => {
    const [v] = await embed(["concrete strength 30 MPa"]);
    expect(v.length).toBe(EMBED_DIM);
  });

  it("is deterministic", async () => {
    const [a] = await embed(["hello world"]);
    const [b] = await embed(["hello world"]);
    expect(a).toEqual(b);
  });

  it("differs across inputs and is ~unit length", async () => {
    const [a] = await embed(["alpha document"]);
    const [b] = await embed(["beta drawing"]);
    expect(a).not.toEqual(b);
    const norm = Math.sqrt(a.reduce((s, x) => s + x * x, 0));
    expect(norm).toBeCloseTo(1, 5);
  });
});
