export interface UserOnboardingState {
  userId: string;
  email: string;
  firstName: string | null;
  signupDate: Date;
  hasResume: boolean;
  hasGeneration: boolean;
  firstGenerationAt: Date | null;
  firstGenerationJobTitle: string | null;
  firstGenerationCompany: string | null;
  hasPaidPlan: boolean;
  creditsRemaining: number;
  emailsSent: string[];
}

interface SequenceStep {
  step: string;
  delay: number;
  skipIf: string | null;
  afterEvent?: string;
}

const ONBOARDING_SEQUENCE: SequenceStep[] = [
  { step: "welcome", delay: 0, skipIf: null },
  { step: "resume_nudge", delay: 1, skipIf: "has_resume" },
  { step: "first_gen_push", delay: 3, skipIf: "has_generation" },
  {
    step: "value_proof",
    delay: 1,
    skipIf: null,
    afterEvent: "first_generation",
  },
  { step: "social_proof", delay: 7, skipIf: null },
  { step: "upgrade_nudge", delay: 14, skipIf: "has_paid_plan" },
];

function daysSince(from: Date, now: Date): number {
  return Math.floor((now.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function shouldSkip(condition: string | null, user: UserOnboardingState): boolean {
  if (!condition) return false;
  switch (condition) {
    case "has_resume":
      return user.hasResume;
    case "has_generation":
      return user.hasGeneration;
    case "has_paid_plan":
      return user.hasPaidPlan;
    default:
      return false;
  }
}

export function getNextOnboardingStep(
  user: UserOnboardingState,
  now: Date
): { step: string } | null {
  // Special case: early upgrade nudge when credits are low
  // Only fires after welcome has been sent to avoid preempting the onboarding start
  if (
    user.creditsRemaining <= 2 &&
    !user.hasPaidPlan &&
    !user.emailsSent.includes("upgrade_nudge") &&
    user.emailsSent.includes("welcome")
  ) {
    return { step: "upgrade_nudge" };
  }

  for (const entry of ONBOARDING_SEQUENCE) {
    // Already sent
    if (user.emailsSent.includes(entry.step)) continue;

    // Should skip based on user state
    if (shouldSkip(entry.skipIf, user)) continue;

    // Check timing
    if (entry.afterEvent === "first_generation") {
      // This email requires a generation to have happened
      if (!user.firstGenerationAt) continue;
      if (daysSince(user.firstGenerationAt, now) < entry.delay) return null;
    } else {
      if (daysSince(user.signupDate, now) < entry.delay) return null;
    }

    return { step: entry.step };
  }

  return null;
}
