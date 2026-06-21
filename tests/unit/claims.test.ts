import { describe, it, expect } from "vitest";
import { extractClaims, inferTopic } from "@/lib/claims";

describe("extractClaims", () => {
  it("pulls value + unit pairs", () => {
    const c = extractClaims("shall achieve 30 MPa at 28 days; slump 75 mm.");
    expect(c.find((x) => x.unitKey === "mpa")?.value).toBe(30);
    expect(c.some((x) => x.unitKey === "mm" && x.value === 75)).toBe(true);
  });

  it("normalizes fire-rating time units", () => {
    const c = extractClaims("provide a 2 hour fire rating");
    expect(c[0].unitKey).toBe("hr");
    expect(c[0].value).toBe(2);
  });

  it("infers topics", () => {
    expect(inferTopic("mpa", "concrete compressive strength")).toMatch(/concrete/i);
    expect(inferTopic("hr", "fire rating")).toMatch(/fire/i);
  });
});
