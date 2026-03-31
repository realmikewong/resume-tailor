import mammoth from "mammoth";
import { extractText } from "unpdf";

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
    const { text } = await extractText(new Uint8Array(buffer), { mergePages: true });
    return text.trim();
  }

  throw new Error(`Unsupported file type: .${extension}`);
}
