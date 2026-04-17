import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { generateUnsubscribeToken } from "@/lib/email/unsubscribe";
import {
  getNextOnboardingStep,
  type UserOnboardingState,
} from "@/lib/email/onboarding-sequence";
import { WelcomeEmail } from "@/emails/onboarding/welcome";
import { ResumeNudgeEmail } from "@/emails/onboarding/resume-nudge";
import { FirstGenerationEmail } from "@/emails/onboarding/first-generation";
import { ValueProofEmail } from "@/emails/onboarding/value-proof";
import { SocialProofEmail } from "@/emails/onboarding/social-proof";
import { UpgradeNudgeEmail } from "@/emails/onboarding/upgrade-nudge";
import { type ReactElement } from "react";

const SUBJECTS: Record<string, string | ((props: Record<string, unknown>) => string)> = {
  welcome: (props) =>
    `Welcome to Taylor — your ${props.creditsRemaining} free credits are ready`,
  resume_nudge: "One upload, unlimited tailoring",
  first_gen_push: "Found a job worth applying to?",
  value_proof: "Your ATS score jumped — here's why that matters",
  social_proof: "How job seekers use Taylor to land interviews",
  upgrade_nudge: "Running low on credits?",
};

function buildEmail(
  step: string,
  props: {
    firstName: string | null;
    creditsRemaining: number;
    jobTitle: string | null;
    companyName: string | null;
    unsubscribeUrl: string;
  }
): ReactElement | null {
  switch (step) {
    case "welcome":
      return WelcomeEmail(props);
    case "resume_nudge":
      return ResumeNudgeEmail(props);
    case "first_gen_push":
      return FirstGenerationEmail(props);
    case "value_proof":
      return ValueProofEmail(props);
    case "social_proof":
      return SocialProofEmail(props);
    case "upgrade_nudge":
      return UpgradeNudgeEmail(props);
    default:
      return null;
  }
}

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();

  // Fetch eligible users via RPC
  const { data: users, error: rpcError } = await admin.rpc(
    "get_onboarding_eligible_users"
  );

  if (rpcError) {
    console.error("[cron/onboarding] RPC error:", rpcError);
    return NextResponse.json({ error: rpcError.message }, { status: 500 });
  }

  if (!users || users.length === 0) {
    return NextResponse.json({ processed: 0, sent: 0, skipped: 0, errors: 0 });
  }

  // Fetch all onboarding email events for these users in one query
  const userIds = users.map((u: { user_id: string }) => u.user_id);
  const { data: allEvents } = await admin
    .from("email_events")
    .select("user_id, step")
    .eq("sequence", "onboarding")
    .in("user_id", userIds);

  // Group events by user
  const eventsByUser = new Map<string, string[]>();
  for (const event of allEvents ?? []) {
    const existing = eventsByUser.get(event.user_id) ?? [];
    existing.push(event.step);
    eventsByUser.set(event.user_id, existing);
  }

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const user of users) {
    const emailsSent = eventsByUser.get(user.user_id) ?? [];

    // Skip if all 6 emails already sent
    if (emailsSent.length >= 6) {
      skipped++;
      continue;
    }

    const state: UserOnboardingState = {
      userId: user.user_id,
      email: user.email,
      firstName: (user.full_name ?? "").split(" ")[0] || null,
      signupDate: new Date(user.created_at),
      hasResume: user.has_resume,
      hasGeneration: user.has_generation,
      firstGenerationAt: user.first_generation_at
        ? new Date(user.first_generation_at)
        : null,
      firstGenerationJobTitle: user.first_generation_job_title,
      firstGenerationCompany: user.first_generation_company,
      hasPaidPlan: !["free", "credit_pack"].includes(user.plan_type ?? "free"),
      creditsRemaining: user.credits_remaining ?? 0,
      emailsSent,
    };

    const next = getNextOnboardingStep(state, now);
    if (!next) {
      skipped++;
      continue;
    }

    const unsubscribeUrl = `https://taylorresume.com/api/email/unsubscribe?token=${generateUnsubscribeToken(user.user_id)}`;

    const emailProps = {
      firstName: (user.full_name ?? "").split(" ")[0] || null,
      creditsRemaining: user.credits_remaining ?? 0,
      jobTitle: user.first_generation_job_title,
      companyName: user.first_generation_company,
      unsubscribeUrl,
    };

    const react = buildEmail(next.step, emailProps);
    if (!react) {
      console.error(`[cron/onboarding] Unknown step: ${next.step}`);
      errors++;
      continue;
    }

    const subjectEntry = SUBJECTS[next.step];
    const subject =
      typeof subjectEntry === "function"
        ? subjectEntry(emailProps)
        : subjectEntry;

    const { id: resendId, error } = await sendEmail({
      to: user.email,
      subject,
      react,
    });

    if (error) {
      console.error(
        `[cron/onboarding] Failed to send ${next.step} to ${user.email}:`,
        error
      );
      errors++;
      continue;
    }

    // Log the email event
    await admin.from("email_events").insert({
      user_id: user.user_id,
      sequence: "onboarding",
      step: next.step,
      resend_id: resendId,
    });

    sent++;
  }

  return NextResponse.json({
    processed: users.length,
    sent,
    skipped,
    errors,
  });
}
