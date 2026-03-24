import { ATSScoreResponseSchema, ATSScoreRequestSchema } from "@/lib/ats-schemas";

describe("ATSScoreRequestSchema", () => {
  it("validates a valid request", () => {
    const result = ATSScoreRequestSchema.safeParse({
      resume_content: "Software engineer with 5 years experience",
      job_description: "Looking for a senior developer",
      job_title: "Senior Developer",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty resume_content", () => {
    const result = ATSScoreRequestSchema.safeParse({
      resume_content: "",
      job_description: "Looking for a developer",
    });
    expect(result.success).toBe(false);
  });

  it("rejects resume_content over 15000 chars", () => {
    const result = ATSScoreRequestSchema.safeParse({
      resume_content: "a".repeat(15001),
      job_description: "Looking for a developer",
    });
    expect(result.success).toBe(false);
  });

  it("allows missing job_title", () => {
    const result = ATSScoreRequestSchema.safeParse({
      resume_content: "Software engineer",
      job_description: "Looking for a developer",
    });
    expect(result.success).toBe(true);
  });
});

describe("ATSScoreResponseSchema", () => {
  it("validates a valid response", () => {
    const result = ATSScoreResponseSchema.safeParse({
      overall_score: 78,
      factors: {
        keyword_match: { score: 82, explanation: "Good keyword coverage" },
        contextual_relevance: { score: 75, explanation: "Decent context" },
        text_formatting_quality: { score: 90, explanation: "Clean formatting" },
        job_title_alignment: { score: 70, explanation: "Partial match" },
        years_of_experience: { score: 65, explanation: "Slightly under" },
        section_completeness: { score: 85, explanation: "All sections present" },
        action_verb_usage: { score: 80, explanation: "Strong verbs" },
        measurable_results: { score: 72, explanation: "Some metrics" },
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects scores outside 0-100", () => {
    const result = ATSScoreResponseSchema.safeParse({
      overall_score: 150,
      factors: {
        keyword_match: { score: 82, explanation: "test" },
        contextual_relevance: { score: 75, explanation: "test" },
        text_formatting_quality: { score: 90, explanation: "test" },
        job_title_alignment: { score: 70, explanation: "test" },
        years_of_experience: { score: 65, explanation: "test" },
        section_completeness: { score: 85, explanation: "test" },
        action_verb_usage: { score: 80, explanation: "test" },
        measurable_results: { score: 72, explanation: "test" },
      },
    });
    expect(result.success).toBe(false);
  });
});
