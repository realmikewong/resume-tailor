import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import mammoth from "mammoth";
import { tailorContent } from "../src/lib/resume-tailor";
import { generateDocuments } from "../src/lib/document-generator";

const [resumePath, jdPath, outDir, jobTitle, companyName, template = "modern"] = process.argv.slice(2);

const { value: resumeText } = await mammoth.extractRawText({ buffer: readFileSync(resumePath) });
const jobDescription = readFileSync(jdPath, "utf8");

const t0 = Date.now();
const content = await tailorContent({ resumeText, jobDescription, jobTitle, companyName });
console.log(`Claude calls took ${((Date.now() - t0) / 1000).toFixed(1)}s`);

const docs = await generateDocuments({
  generationId: "local",
  userId: "local",
  templateChoice: template,
  resumeContent: content.tailored_resume_content,
  coverLetterContent: content.cover_letter_content,
  jobTitle,
  companyName,
});

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "resume.json"), content.tailored_resume_content);
writeFileSync(join(outDir, "cover-letter.json"), content.cover_letter_content);
writeFileSync(join(outDir, "source-resume.txt"), resumeText);
for (const [name, { buffer }] of Object.entries(docs)) writeFileSync(join(outDir, name), buffer);
console.log("Wrote", Object.keys(docs).join(", "));
