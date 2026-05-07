import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ThankYouEmailForm, type Prefill } from "@/components/thank-you/thank-you-email-form";

export const metadata: Metadata = {
  title: "Free Interview Thank You Email Generator | Taylor Resumé",
  description:
    "Write a personalized post-interview thank you email in seconds. Paste your job description, resume, and memorable moment — we'll craft the perfect follow-up.",
};

async function getPrefill(generationId: string): Promise<Prefill> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("generations")
      .select("tailored_resume_content, jobs(job_description, company_name, job_title), resumes(raw_text_content)")
      .eq("id", generationId)
      .single();

    if (!data) return null;

    const jobData = Array.isArray(data.jobs) ? data.jobs[0] : data.jobs;
    const resumeData = Array.isArray(data.resumes) ? data.resumes[0] : data.resumes;

    if (!jobData?.job_description) return null;

    return {
      jobDescription: jobData.job_description,
      resumeContent:
        data.tailored_resume_content ?? resumeData?.raw_text_content ?? "",
      companyName: jobData.company_name,
      jobTitle: jobData.job_title,
    };
  } catch {
    return null;
  }
}

export default async function ThankYouEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ generation_id?: string }>;
}) {
  const { generation_id } = await searchParams;
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const prefill = generation_id && UUID_RE.test(generation_id)
    ? await getPrefill(generation_id)
    : null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-4 font-sans">
          Write Your Thank You Email
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          {prefill
            ? "Your job and resume are pre-filled. Add your interviewer's details and a memorable moment."
            : "Fill in the details below and we'll write a personalized post-interview follow-up in seconds."}
        </p>
      </div>
      <ThankYouEmailForm prefill={prefill} />
    </div>
  );
}
