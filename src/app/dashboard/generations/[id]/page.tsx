import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DownloadButtons } from "@/components/generations/download-buttons";
import { ResumePreview } from "@/components/generations/resume-preview";
import { CoverLetterPreview } from "@/components/generations/cover-letter-preview";
import { ATSScoreLoader } from "@/components/ats/ats-score-loader";
import Link from "next/link";

export default async function GenerationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: generation } = await supabase
    .from("generations")
    .select("*, jobs(*), resumes(*)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!generation) notFound();

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-2">Generation Results</h1>
      <p className="text-gray-600 mb-6">
        {generation.jobs.job_title} at {generation.jobs.company_name}
      </p>

      {generation.status === "completed" && (
        <>
          <DownloadButtons
            filePaths={{
              resume_word: generation.resume_word_file_path,
              resume_pdf: generation.resume_pdf_file_path,
              cover_letter_word: generation.cover_letter_word_file_path,
              cover_letter_pdf: generation.cover_letter_pdf_file_path,
            }}
          />

          <ATSScoreLoader
            generationId={generation.id}
            baseResumeContent={generation.resumes?.raw_text_content || null}
            tailoredResumeContent={generation.tailored_resume_content}
            jobDescription={generation.jobs.job_description}
            jobTitle={generation.jobs.job_title}
            existingBaseScores={generation.base_ats_scores}
            existingTailoredScores={generation.tailored_ats_scores}
          />

          {generation.tailored_resume_content && (
            <ResumePreview content={generation.tailored_resume_content} />
          )}

          {generation.cover_letter_content && (
            <CoverLetterPreview content={generation.cover_letter_content} />
          )}

          <div className="mt-6">
            <Link
              href="/dashboard/jobs"
              className="text-blue-600 hover:underline text-sm"
            >
              Add to Job Tracker
            </Link>
          </div>
        </>
      )}

      {generation.status === "failed" && (
        <div className="bg-red-50 p-4 rounded-lg">
          <p className="text-red-700">
            Generation failed. Your credit has been refunded.
          </p>
          <Link
            href="/dashboard/jobs/new"
            className="text-blue-600 hover:underline text-sm mt-2 inline-block"
          >
            Try again
          </Link>
        </div>
      )}

      {generation.status === "processing" && (
        <div className="text-center py-12">
          <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Still processing...</p>
        </div>
      )}
    </div>
  );
}
