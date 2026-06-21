import { describe, it, expect } from "vitest";
import { extractRefs } from "@/lib/refs";

describe("extractRefs", () => {
  it("extracts MasterFormat, sheet, and RFI codes", () => {
    const r = extractRefs(
      "Concrete per Section 03 30 00, see S-201 and M-301; raised in RFI-14.",
    );
    expect(r).toContain("03 30 00");
    expect(r).toContain("S-201");
    expect(r).toContain("M-301");
    expect(r).toContain("RFI-14");
  });

  it("excludes the document's own code", () => {
    const r = extractRefs("Drawing S-201. Concrete per 03 30 00.", "S-201");
    expect(r).not.toContain("S-201");
    expect(r).toContain("03 30 00");
  });

  it("ignores incidental numbers (ACI 301, 20 mm)", () => {
    expect(extractRefs("Cure per ACI 301 with 20 mm aggregate.")).toEqual([]);
  });
});
