/**
 * Extracts plain text from an uploaded file's bytes based on its MIME type
 * / extension. This is the "Extract text" step of the RAG pipeline
 * (Upload -> Extract -> Chunk -> Embed -> Store -> Retrieve).
 */
export async function extractText(buffer: Buffer, fileName: string, mimeType: string): Promise<string> {
  const isPdf = mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");

  if (isPdf) {
    // Dynamically imported so this heavier dependency only loads on the
    // actual PDF code path.
    const pdfParse = (await import("pdf-parse")).default;
    const result = await pdfParse(buffer);
    return result.text;
  }

  const isPlainText =
    mimeType.startsWith("text/") || /\.(txt|md|markdown)$/i.test(fileName);
  if (isPlainText) {
    return buffer.toString("utf-8");
  }

  throw new Error(`Unsupported file type for text extraction: ${mimeType || fileName}`);
}
