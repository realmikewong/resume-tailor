import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deductCredit } from "@/lib/credits";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { job, template_choice } = await request.json();

  // Validate required fields
  if (!job?.company_name || !job?.job_title || !job?.job_description) {
    return NextResponse.json(
      { error: "Missing required job fields" },
      { status: 400 }
    );
  }

  // Get active resume
  const { data: resume } = await supabase
    .from("resumes")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!resume) {
    return NextResponse.json(
      { error: "No active resume found. Please upload a resume first." },
      { status: 400 }
    );
  }

  // Deduct credit atomically
  const admin = createAdminClient();
  const { success } = await deductCredit(admin, user.id);

  if (!success) {
    return NextResponse.json(
      { error: "Insufficient credits. Please purchase more credits to continue." },
      { status: 402 }
    );
  }

  // Create job record
  const { data: jobRecord, error: jobError } = await supabase
    .from("jobs")
    .insert({
      user_id: user.id,
      source_url: job.source_url ?? null,
      company_name: job.company_name,
      job_title: job.job_title,
      job_description: job.job_description,
      pay_range_low: job.pay_range_low ? parseFloat(job.pay_range_low) : null,
      pay_range_high: job.pay_range_high ? parseFloat(job.pay_range_high) : null,
      job_location: job.job_location || null,
      location_type: job.location_type || null,
      scrape_status: job.scrape_status ?? "manual",
    })
    .select()
    .single();

  if (jobError) {
    // Refund the credit since we failed before Make.com
    await admin.rpc("refund_credit", {
      p_user_id: user.id,
      p_reason: "refund_job_creation_failed",
    });
    return NextResponse.json(
      { error: "Failed to save job" },
      { status: 500 }
    );
  }

  // Create generation record with callback token
  const { data: generation, error: genError } = await supabase
    .from("generations")
    .insert({
      user_id: user.id,
      job_id: jobRecord.id,
      resume_id: resume.id,
      template_choice: template_choice ?? "modern",
      status: "pending",
    })
    .select()
    .single();

  if (genError) {
    await admin.rpc("refund_credit", {
      p_user_id: user.id,
      p_reason: "refund_generation_creation_failed",
    });
    return NextResponse.json(
      { error: "Failed to create generation" },
      { status: 500 }
    );
  }

  // Update status to processing before calling Make
  await admin
    .from("generations")
    .update({ status: "processing" })
    .eq("id", generation.id);

  // Call Make.com webhook (fire and forget — don't await the full scenario)
  const callbackBaseUrl = process.env.MAKE_CALLBACK_BASE_URL!;
  const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL!;

  console.log("[generate] Calling Make webhook:", makeWebhookUrl);
  console.log("[generate] Callback URL:", `${callbackBaseUrl}?generation_id=${generation.id}&callback_token=${generation.callback_token}`);

  fetch(makeWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      generation_id: generation.id,
      callback_token: generation.callback_token,
      resume_content: resume.raw_text_content,
      job_description: job.job_description,
      job_title: job.job_title,
      company_name: job.company_name,
      callback_url: `${callbackBaseUrl}?generation_id=${generation.id}&callback_token=${generation.callback_token}`,
    }),
  })
    .then((res) => {
      console.log("[generate] Make webhook response status:", res.status);
    })
    .catch((err) => {
      console.error("[generate] Make webhook fetch error:", err);
    });

  return NextResponse.json({ generation_id: generation.id });
}
