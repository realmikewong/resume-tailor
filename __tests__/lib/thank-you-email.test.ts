import {
  ThankYouEmailRequestSchema,
  buildThankYouEmailPrompt,
  THANK_YOU_EMAIL_SYSTEM_PROMPT,
} from "@/lib/thank-you-email";

const validInput = {
  job_description: "We are looking for a senior engineer to lead our platform team.",
  resume_content: "John Doe — 10 years of software engineering experience.",
  interviewer_name: "Sarah Chen",
  interviewer_title: "Engineering Manager",
  memorable_moment: "We talked about the team's shift to microservices.",
};

describe("ThankYouEmailRequestSchema", () => {
  it("accepts valid input", () => {
    expect(ThankYouEmailRequestSchema.safeParse(validInput).success).toBe(true);
  });

  it("rejects missing job_description", () => {
    const { job_description, ...rest } = validInput;
    expect(ThankYouEmailRequestSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects missing resume_content", () => {
    const { resume_content, ...rest } = validInput;
    expect(ThankYouEmailRequestSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects missing interviewer_name", () => {
    const { interviewer_name, ...rest } = validInput;
    expect(ThankYouEmailRequestSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects missing interviewer_title", () => {
    const { interviewer_title, ...rest } = validInput;
    expect(ThankYouEmailRequestSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects missing memorable_moment", () => {
    const { memorable_moment, ...rest } = validInput;
    expect(ThankYouEmailRequestSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects job_description over 10000 chars", () => {
    const result = ThankYouEmailRequestSchema.safeParse({
      ...validInput,
      job_description: "x".repeat(10001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects resume_content over 8000 chars", () => {
    const result = ThankYouEmailRequestSchema.safeParse({
      ...validInput,
      resume_content: "x".repeat(8001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects interviewer_name over 100 chars", () => {
    const result = ThankYouEmailRequestSchema.safeParse({
      ...validInput,
      interviewer_name: "x".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("rejects interviewer_title over 200 chars", () => {
    const result = ThankYouEmailRequestSchema.safeParse({
      ...validInput,
      interviewer_title: "x".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("rejects memorable_moment over 1000 chars", () => {
    const result = ThankYouEmailRequestSchema.safeParse({
      ...validInput,
      memorable_moment: "x".repeat(1001),
    });
    expect(result.success).toBe(false);
  });
});

describe("buildThankYouEmailPrompt", () => {
  it("includes interviewer name and title", () => {
    const prompt = buildThankYouEmailPrompt(validInput);
    expect(prompt).toContain("Sarah Chen");
    expect(prompt).toContain("Engineering Manager");
  });

  it("includes the memorable moment", () => {
    const prompt = buildThankYouEmailPrompt(validInput);
    expect(prompt).toContain("We talked about the team's shift to microservices.");
  });

  it("includes resume content", () => {
    const prompt = buildThankYouEmailPrompt(validInput);
    expect(prompt).toContain("John Doe — 10 years of software engineering experience.");
  });

  it("includes job description", () => {
    const prompt = buildThankYouEmailPrompt(validInput);
    expect(prompt).toContain(
      "We are looking for a senior engineer to lead our platform team."
    );
  });
});

describe("THANK_YOU_EMAIL_SYSTEM_PROMPT", () => {
  it("is a non-empty string", () => {
    expect(typeof THANK_YOU_EMAIL_SYSTEM_PROMPT).toBe("string");
    expect(THANK_YOU_EMAIL_SYSTEM_PROMPT.length).toBeGreaterThan(0);
  });
});
