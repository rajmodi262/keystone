import { describe, it, expect } from "vitest";
import { chunkText } from "@/lib/chunk";

describe("chunkText", () => {
  it("returns [] for empty input", () => {
    expect(chunkText("   ")).toEqual([]);
  });

  it("keeps short text as a single chunk", () => {
    expect(chunkText("A short note.").length).toBe(1);
  });

  it("splits long multi-paragraph text into multiple chunks", () => {
    const para = "Lorem ipsum dolor sit amet consectetur. ".repeat(40);
    const text = [para, para, para].join("\n\n");
    expect(chunkText(text, 600, 80).length).toBeGreaterThan(1);
  });
});
