import pdfParse from "pdf-parse";

export type PdfExtractionResult = {
  text: string;
  pages: number;
  info?: any;
  metadata?: any;
  warnings: string[];
};

export async function extractPdfText(buffer: Buffer): Promise<PdfExtractionResult> {
  const warnings: string[] = [];

  const result = await pdfParse(buffer, {
    pagerender: undefined,
  });

  const text = cleanPdfText(result.text || "");

  if (!text || text.length < 40) {
    warnings.push(
      "O PDF parece ter pouco texto extraível. Ele pode ser uma imagem digitalizada e exigir OCR."
    );
  }

  return {
    text,
    pages: result.numpages || 0,
    info: result.info,
    metadata: result.metadata,
    warnings,
  };
}

export function cleanPdfText(text: string) {
  return text
    .replace(/\u0000/g, "")
    .replace(/[\t ]+/g, " ")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}
