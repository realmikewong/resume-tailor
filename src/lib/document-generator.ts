// Stub — full implementation in Task 9

export type GenerateDocumentsInput = {
  generationId: string;
  userId: string;
  templateChoice: string;
  resumeContent: string;
  coverLetterContent: string;
  jobTitle: string;
  companyName: string;
};

export type GeneratedFile = {
  buffer: Buffer;
  contentType: string;
};

export async function generateDocuments(
  input: GenerateDocumentsInput
): Promise<Record<string, GeneratedFile>> {
  // TODO: Implement in Task 9
  throw new Error("Document generation not yet implemented");
}
