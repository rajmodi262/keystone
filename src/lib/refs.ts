// Cross-reference extraction — the clever, tractable part of the impact graph.
// AEC documents use rigid identifiers, so finding references is regex, not magic:
//   - CSI MasterFormat codes:  "03 30 00", "09 91 00"
//   - Sheet numbers:           "S-201", "A-101", "M-301"
//   - RFI numbers:             "RFI-14"
const MASTERFORMAT = /\b\d{2}\s\d{2}\s\d{2}\b/g;
const SHEET = /\b[A-Z]{1,2}-\d{2,3}[A-Z]?\b/g;
const RFI = /\bRFI-\d+\b/gi;

export function extractRefs(text: string, selfCode?: string): string[] {
  const found = new Set<string>();
  for (const re of [MASTERFORMAT, SHEET, RFI]) {
    const matches = text.match(re);
    if (matches) matches.forEach((m) => found.add(m.toUpperCase()));
  }
  if (selfCode) found.delete(selfCode.toUpperCase());
  return Array.from(found);
}
