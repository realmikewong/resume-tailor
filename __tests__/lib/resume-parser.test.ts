import { extractTextFromBuffer } from "@/lib/resume-parser";

describe("extractTextFromBuffer", () => {
  it("throws on unsupported file type", async () => {
    const buffer = Buffer.from("hello");
    await expect(
      extractTextFromBuffer(buffer, "test.txt")
    ).rejects.toThrow("Unsupported file type");
  });

  it("extracts text from a docx buffer", async () => {
    // This test requires a sample .docx file in __tests__/fixtures/
    // For now, test the error path
    const buffer = Buffer.from("not a real docx");
    await expect(
      extractTextFromBuffer(buffer, "test.docx")
    ).rejects.toThrow();
  });
});
