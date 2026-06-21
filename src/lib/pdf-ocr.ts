// Client-side PDF text extraction with an OCR fallback. Runs in the browser
// (which has a canvas and spare CPU) so the serverless API never has to render
// or OCR. Tries embedded text first; only image-only/scanned PDFs hit Tesseract.

export interface ExtractResult {
  text: string;
  usedOcr: boolean;
  pages: number;
}

export async function extractPdfText(
  file: File,
  onProgress?: (msg: string) => void,
): Promise<ExtractResult> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;

  // 1) Embedded text layer.
  let text = "";
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    text +=
      content.items
        .map((i) => ("str" in i ? i.str : ""))
        .join(" ") + "\n";
  }
  if (text.replace(/\s/g, "").length >= 40) {
    return { text: text.trim(), usedOcr: false, pages: pdf.numPages };
  }

  // 2) OCR fallback for scanned / image-only PDFs.
  onProgress?.("Scanned PDF detected — running OCR…");
  const Tesseract = (await import("tesseract.js")).default;
  let ocr = "";
  for (let p = 1; p <= pdf.numPages; p++) {
    onProgress?.(`OCR page ${p}/${pdf.numPages}…`);
    const page = await pdf.getPage(p);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    const result = await Tesseract.recognize(canvas, "eng");
    ocr += result.data.text + "\n";
  }
  return { text: ocr.trim(), usedOcr: true, pages: pdf.numPages };
}
