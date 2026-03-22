import { generateDocuments } from "@/lib/document-generator";

describe("generateDocuments", () => {
  it("generates all four document files", async () => {
    const result = await generateDocuments({
      generationId: "test-id",
      userId: "test-user",
      templateChoice: "modern",
      resumeContent: JSON.stringify({
        name: "Jane Doe",
        contact: "jane@example.com | 555-1234",
        summary: "Experienced software engineer",
        experience: [
          {
            title: "Senior Engineer",
            company: "Acme Corp",
            dates: "2020-2024",
            bullets: ["Led team of 5", "Built microservices"],
          },
        ],
        education: [
          {
            degree: "BS Computer Science",
            school: "State University",
            year: "2016",
          },
        ],
        skills: ["TypeScript", "React", "Node.js"],
      }),
      coverLetterContent: JSON.stringify({
        greeting: "Dear Hiring Manager,",
        body: [
          "I am writing to express my interest in the Senior Engineer position at TechCo.",
          "With over 8 years of experience in software development, I believe I am well-suited for this role.",
          "Thank you for considering my application.",
        ],
        signoff: "Sincerely,",
        name: "Jane Doe",
      }),
      jobTitle: "Senior Engineer",
      companyName: "TechCo",
    });

    expect(result["resume.docx"]).toBeDefined();
    expect(result["resume.docx"].buffer).toBeInstanceOf(Buffer);
    expect(result["resume.pdf"]).toBeDefined();
    expect(result["resume.pdf"].buffer).toBeInstanceOf(Buffer);
    expect(result["cover-letter.docx"]).toBeDefined();
    expect(result["cover-letter.pdf"]).toBeDefined();
  });
});
