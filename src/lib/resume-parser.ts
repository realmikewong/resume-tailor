import mammoth from "mammoth";

export async function extractTextFromBuffer(
  buffer: Buffer,
  fileName: string
): Promise<string> {
  const extension = fileName.toLowerCase().split(".").pop();

  if (extension === "docx") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  }

  if (extension === "pdf") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse");
    const result = await pdfParse(buffer);
    return result.text.trim();
  }

  throw new Error(`Unsupported file type: .${extension}`);
}
