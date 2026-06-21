// Pack a document's text into ~target-sized chunks on paragraph boundaries,
// with a little overlap so a fact split across a boundary is still retrievable.
export function chunkText(text: string, target = 600, overlap = 80): string[] {
  const clean = text.replace(/\r/g, "").trim();
  if (!clean) return [];

  const paras = clean
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const packed: string[] = [];
  let buf = "";
  for (const p of paras) {
    if (buf && (buf + "\n\n" + p).length > target) {
      packed.push(buf);
      buf = buf.slice(Math.max(0, buf.length - overlap));
    }
    buf = buf ? buf + "\n\n" + p : p;
  }
  if (buf.trim()) packed.push(buf.trim());

  // hard-split anything still oversized
  const out: string[] = [];
  for (const c of packed) {
    if (c.length <= target * 1.6) out.push(c);
    else for (let i = 0; i < c.length; i += target) out.push(c.slice(i, i + target));
  }
  return out;
}
