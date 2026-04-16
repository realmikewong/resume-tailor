import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { generateUnsubscribeToken } from "@/lib/email/unsubscribe";
import { WelcomeEmail } from "@/emails/onboarding/welcome";

export async function POST(request: Request) {
  // Validate webhook secret
  const secret = request.headers.get("x-webhook-secret");
  if (secret !== process.env.SUPABASE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const record = body.record;
  if (!record?.id || !record?.email) {
    return NextResponse.json({ error: "Missing user data" }, { status: 400 });
  }

  const userId = record.id;
  const email = record.email;
  const fullName = record.raw_user_meta_data?.full_name ?? "";
  const firstName = fullName.split(" ")[0] || null;

  const admin = createAdminClient();

  // Check opt-out (defensive — profile may not exist yet due to race condition)
  const { data: profile } = await admin
    .from("profiles")
    .select("email_opt_out, credits_remaining")
    .eq("user_id", userId)
    .single();

  if (profile?.email_opt_out) {
    return NextResponse.json({ skipped: true, reason: "opted_out" });
  }

  // Prevent duplicate sends on webhook retry
  const { data: existing } = await admin
    .from("email_events")
    .select("id")
    .eq("user_id", userId)
    .eq("sequence", "onboarding")
    .eq("step", "welcome")
    .limit(1)
    .single();

  if (existing) {
    return NextResponse.json({ skipped: true, reason: "already_sent" });
  }

  const creditsRemaining = profile?.credits_remaining ?? 10;
  const unsubscribeUrl = `https://taylorresume.com/api/email/unsubscribe?token=${generateUnsubscribeToken(userId)}`;

  // Send welcome email
  const { id: resendId, error } = await sendEmail({
    to: email,
    subject: `Welcome to Taylor — your ${creditsRemaining} free credits are ready`,
    react: WelcomeEmail({ firstName, creditsRemaining, unsubscribeUrl }),
  });

  if (error) {
    console.error("[webhook/user-created] Email send failed:", error);
    // Return 200 anyway — don't block user creation. Cron will retry.
    return NextResponse.json({ sent: false, error });
  }

  // Log the email event
  await admin.from("email_events").insert({
    user_id: userId,
    sequence: "onboarding",
    step: "welcome",
    resend_id: resendId,
  });

  return NextResponse.json({ sent: true, step: "welcome" });
}
