import {
  getNextOnboardingStep,
  type UserOnboardingState,
} from "@/lib/email/onboarding-sequence";

describe("getNextOnboardingStep", () => {
  const baseUser: UserOnboardingState = {
    userId: "user-1",
    email: "test@example.com",
    firstName: null,
    signupDate: new Date("2026-04-01T00:00:00Z"),
    hasResume: false,
    hasGeneration: false,
    firstGenerationAt: null,
    firstGenerationJobTitle: null,
    firstGenerationCompany: null,
    hasPaidPlan: false,
    creditsRemaining: 10,
    emailsSent: [],
  };

  it("returns welcome as first step for a new user", () => {
    const now = new Date("2026-04-01T00:00:00Z");
    const result = getNextOnboardingStep(baseUser, now);
    expect(result?.step).toBe("welcome");
  });

  it("returns resume_nudge on day 1 if welcome was sent", () => {
    const now = new Date("2026-04-02T09:00:00Z");
    const user = { ...baseUser, emailsSent: ["welcome"] };
    const result = getNextOnboardingStep(user, now);
    expect(result?.step).toBe("resume_nudge");
  });

  it("skips resume_nudge if user already has a resume", () => {
    const now = new Date("2026-04-02T09:00:00Z");
    const user = { ...baseUser, emailsSent: ["welcome"], hasResume: true };
    const result = getNextOnboardingStep(user, now);
    expect(result).toBeNull();
  });

  it("returns first_gen_push on day 3 if resume_nudge skipped", () => {
    const now = new Date("2026-04-04T09:00:00Z");
    const user = { ...baseUser, emailsSent: ["welcome"], hasResume: true };
    const result = getNextOnboardingStep(user, now);
    expect(result?.step).toBe("first_gen_push");
  });

  it("skips first_gen_push if user already has a generation", () => {
    const now = new Date("2026-04-04T09:00:00Z");
    const user = {
      ...baseUser,
      emailsSent: ["welcome"],
      hasResume: true,
      hasGeneration: true,
      firstGenerationAt: new Date("2026-04-02T00:00:00Z"),
    };
    const result = getNextOnboardingStep(user, now);
    expect(result?.step).toBe("value_proof");
  });

  it("returns value_proof 1 day after first generation", () => {
    const now = new Date("2026-04-06T09:00:00Z");
    const user = {
      ...baseUser,
      emailsSent: ["welcome", "resume_nudge", "first_gen_push"],
      hasResume: true,
      hasGeneration: true,
      firstGenerationAt: new Date("2026-04-05T00:00:00Z"),
    };
    const result = getNextOnboardingStep(user, now);
    expect(result?.step).toBe("value_proof");
  });

  it("does not return value_proof if no generation exists", () => {
    const now = new Date("2026-04-10T09:00:00Z");
    const user = {
      ...baseUser,
      emailsSent: ["welcome", "resume_nudge", "first_gen_push"],
    };
    const result = getNextOnboardingStep(user, now);
    expect(result?.step).toBe("social_proof");
  });

  it("returns social_proof on day 7", () => {
    const now = new Date("2026-04-08T09:00:00Z");
    const user = {
      ...baseUser,
      emailsSent: ["welcome", "resume_nudge", "first_gen_push", "value_proof"],
      hasResume: true,
      hasGeneration: true,
      firstGenerationAt: new Date("2026-04-03T00:00:00Z"),
    };
    const result = getNextOnboardingStep(user, now);
    expect(result?.step).toBe("social_proof");
  });

  it("returns upgrade_nudge on day 14 for free users", () => {
    const now = new Date("2026-04-15T09:00:00Z");
    const user = {
      ...baseUser,
      emailsSent: [
        "welcome",
        "resume_nudge",
        "first_gen_push",
        "value_proof",
        "social_proof",
      ],
      hasResume: true,
      hasGeneration: true,
      firstGenerationAt: new Date("2026-04-03T00:00:00Z"),
    };
    const result = getNextOnboardingStep(user, now);
    expect(result?.step).toBe("upgrade_nudge");
  });

  it("skips upgrade_nudge if user has a paid plan", () => {
    const now = new Date("2026-04-15T09:00:00Z");
    const user = {
      ...baseUser,
      emailsSent: [
        "welcome",
        "resume_nudge",
        "first_gen_push",
        "value_proof",
        "social_proof",
      ],
      hasPaidPlan: true,
    };
    const result = getNextOnboardingStep(user, now);
    expect(result).toBeNull();
  });

  it("sends upgrade_nudge early when credits <= 2", () => {
    const now = new Date("2026-04-05T09:00:00Z");
    const user = {
      ...baseUser,
      emailsSent: ["welcome", "resume_nudge"],
      hasResume: true,
      hasGeneration: true,
      firstGenerationAt: new Date("2026-04-03T00:00:00Z"),
      creditsRemaining: 2,
    };
    const result = getNextOnboardingStep(user, now);
    expect(result?.step).toBe("upgrade_nudge");
  });

  it("returns null when all emails have been sent", () => {
    const now = new Date("2026-04-20T09:00:00Z");
    const user = {
      ...baseUser,
      emailsSent: [
        "welcome",
        "resume_nudge",
        "first_gen_push",
        "value_proof",
        "social_proof",
        "upgrade_nudge",
      ],
    };
    const result = getNextOnboardingStep(user, now);
    expect(result).toBeNull();
  });
});
