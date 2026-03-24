import { buildATSPrompt, parseATSResponse, computeOverallScore } from "@/lib/ats-scorer";

describe("buildATSPrompt", () => {
  it("includes resume content and job description", () => {
    const prompt = buildATSPrompt({
      resume_content: "My resume text",
      job_description: "The job posting",
    });
    expect(prompt).toContain("My resume text");
    expect(prompt).toContain("The job posting");
  });

  it("includes job title when provided", () => {
    const prompt = buildATSPrompt({
      resume_content: "My resume",
      job_description: "The job",
      job_title: "Software Engineer",
    });
    expect(prompt).toContain("Software Engineer");
  });
});

describe("computeOverallScore", () => {
  it("computes weighted average correctly for all 100s", () => {
    const factors = {
      keyword_match: { score: 100, explanation: "test" },
      contextual_relevance: { score: 100, explanation: "test" },
      text_formatting_quality: { score: 100, explanation: "test" },
      job_title_alignment: { score: 100, explanation: "test" },
      years_of_experience: { score: 100, explanation: "test" },
      section_completeness: { score: 100, explanation: "test" },
      action_verb_usage: { score: 100, explanation: "test" },
      measurable_results: { score: 100, explanation: "test" },
    };
    expect(computeOverallScore(factors)).toBe(100);
  });

  it("computes weighted average for mixed scores", () => {
    const factors = {
      keyword_match: { score: 80, explanation: "test" },       // 0.20 * 80 = 16
      contextual_relevance: { score: 60, explanation: "test" }, // 0.15 * 60 = 9
      text_formatting_quality: { score: 90, explanation: "test" }, // 0.15 * 90 = 13.5
      job_title_alignment: { score: 70, explanation: "test" },  // 0.10 * 70 = 7
      years_of_experience: { score: 50, explanation: "test" },  // 0.10 * 50 = 5
      section_completeness: { score: 85, explanation: "test" }, // 0.10 * 85 = 8.5
      action_verb_usage: { score: 75, explanation: "test" },    // 0.10 * 75 = 7.5
      measurable_results: { score: 40, explanation: "test" },   // 0.10 * 40 = 4
    };
    // Total = 16 + 9 + 13.5 + 7 + 5 + 8.5 + 7.5 + 4 = 70.5 → 71
    expect(computeOverallScore(factors)).toBe(71);
  });
});

describe("parseATSResponse", () => {
  it("parses valid JSON response", () => {
    const validJson = JSON.stringify({
      overall_score: 75,
      factors: {
        keyword_match: { score: 80, explanation: "Good" },
        contextual_relevance: { score: 70, explanation: "OK" },
        text_formatting_quality: { score: 85, explanation: "Clean" },
        job_title_alignment: { score: 60, explanation: "Partial" },
        years_of_experience: { score: 75, explanation: "Match" },
        section_completeness: { score: 90, explanation: "Complete" },
        action_verb_usage: { score: 65, explanation: "Decent" },
        measurable_results: { score: 55, explanation: "Few" },
      },
    });
    const result = parseATSResponse(validJson);
    expect(result.factors.keyword_match.score).toBe(80);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseATSResponse("not json")).toThrow();
  });

  it("throws on missing factors", () => {
    expect(() => parseATSResponse(JSON.stringify({ overall_score: 50 }))).toThrow();
  });
});
