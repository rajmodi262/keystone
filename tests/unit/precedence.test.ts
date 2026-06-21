import { describe, it, expect } from "vitest";
import { classifySeverity, recommendGoverning } from "@/lib/precedence";

describe("classifySeverity", () => {
  it("structural strength is CRITICAL", () => {
    expect(classifySeverity("Concrete compressive strength", "SPEC", "STRUCT")).toBe(
      "CRITICAL",
    );
  });
  it("fire rating is CRITICAL", () => {
    expect(classifySeverity("Fire-resistance rating", "ARCH", "ARCH")).toBe(
      "CRITICAL",
    );
  });
  it("anchor/bolt is HIGH", () => {
    expect(classifySeverity("Anchor / bolt layout", "ARCH", "MECH")).toBe("HIGH");
  });
  it("paint/finish is LOW", () => {
    expect(classifySeverity("Paint sheen", "ARCH", "ARCH")).toBe("LOW");
  });
});

describe("recommendGoverning", () => {
  it("the more current revision supersedes", () => {
    const r = recommendGoverning(
      { code: "03 30 00", discipline: "SPEC", revision: "C" },
      { code: "S-201", discipline: "STRUCT", revision: "A" },
    );
    expect(r.governingCode).toBe("03 30 00");
  });
  it("specification governs the drawing at equal revision", () => {
    const r = recommendGoverning(
      { code: "S-201", discipline: "STRUCT", revision: "A" },
      { code: "09 91 00", discipline: "SPEC", revision: "A" },
    );
    expect(r.governingCode).toBe("09 91 00");
  });
  it("returns no precedence for equal-rank peers", () => {
    const r = recommendGoverning(
      { code: "S-201", discipline: "STRUCT", revision: "A" },
      { code: "S-202", discipline: "STRUCT", revision: "A" },
    );
    expect(r.governingCode).toBeNull();
  });
});
