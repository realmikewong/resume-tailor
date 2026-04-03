"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PasteJobInput } from "@/components/jobs/paste-job-input";
import type { ExtractedJobFields } from "@/lib/job-extractor-schemas";
import { JobForm, type JobFormData } from "@/components/jobs/job-form";
import { TemplatePicker } from "@/components/jobs/template-picker";
import { trackEvent } from "@/lib/analytics";

type Step = "input" | "details" | "confirm" | "processing" | "results";

export default function NewJobPage() {
  const [step, setStep] = useState<Step>("input");
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [scrapeStatus, setScrapeStatus] = useState<"scraped" | "manual" | "failed">("manual");
  const [isStaffingAgency, setIsStaffingAgency] = useState(false);
  const [jobData, setJobData] = useState<JobFormData | null>(null);
  const [initialFormData, setInitialFormData] = useState<Partial<JobFormData>>({});
  const [template, setTemplate] = useState("modern");
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [planType, setPlanType] = useState<string>("free");
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("profiles")
        .select("plan_type")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.plan_type) setPlanType(data.plan_type);
        });
    });
  }, []);

  // Step 1: Paste input
  const handleExtracted = (fields: ExtractedJobFields) => {
    setSourceUrl(null);
    setScrapeStatus("scraped");
    setIsStaffingAgency(fields.is_staffing_agency);
    setInitialFormData({
      company_name: fields.company_name ?? "",
      job_title: fields.job_title ?? "",
      job_description: fields.job_description ?? "",
      pay_range_low: fields.pay_range_low?.toString() ?? "",
      pay_range_high: fields.pay_range_high?.toString() ?? "",
      job_location: fields.job_location ?? "",
      location_type: (fields.location_type as JobFormData["location_type"]) ?? "",
    });
    trackEvent("job_description_submitted");
    setStep("details");
  };

  const handleSkipScrape = () => {
    setScrapeStatus("manual");
    trackEvent("job_description_submitted");
    setStep("details");
  };

  // Step 2: Job details form
  const handleJobFormSubmit = (data: JobFormData) => {
    setJobData(data);
    setStep("confirm");
  };

  // Step 3: Confirm and generate
  const handleGenerate = async () => {
    setError(null);
    setStep("processing");

    trackEvent("generation_started", { plan_type: planType });
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        job: { ...jobData, source_url: sourceUrl, scrape_status: scrapeStatus },
        template_choice: template,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
      setStep("confirm");
      return;
    }

    setGenerationId(data.generation_id);
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Add New Job</h1>

      {/* Step indicators */}
      <div className="flex gap-2 mb-8">
        {(["input", "details", "confirm", "processing", "results"] as Step[]).map((s, i) => (
          <div
            key={s}
            className={`h-2 flex-1 rounded ${
              (["input", "details", "confirm", "processing", "results"] as Step[]).indexOf(step) >= i
                ? "bg-blue-600"
                : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      {step === "input" && (
        <div>
          <h2 className="text-lg font-medium mb-4">Step 1: Job Posting</h2>
          <PasteJobInput onExtracted={handleExtracted} onSkip={handleSkipScrape} />
        </div>
      )}

      {step === "details" && (
        <div>
          <h2 className="text-lg font-medium mb-4">Step 2: Job Details</h2>
          {scrapeStatus === "scraped" && (
            <p className="text-sm text-green-600 mb-4">
              Fields pre-filled from URL. Please review and edit as needed.
            </p>
          )}
          {isStaffingAgency && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm mb-4">
              This appears to be posted by a recruiting agency. Please verify the company name.
            </div>
          )}
          <JobForm initialData={initialFormData} onSubmit={handleJobFormSubmit} />
        </div>
      )}

      {step === "confirm" && (
        <div>
          <h2 className="text-lg font-medium mb-4">Step 3: Confirm & Generate</h2>
          {error && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-md mb-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
            <h3 className="font-medium">{jobData?.job_title}</h3>
            <p className="text-gray-600">{jobData?.company_name}</p>
            <p className="text-sm text-gray-500 mt-2">
              {jobData?.job_location} {jobData?.location_type && `(${jobData.location_type})`}
            </p>
          </div>
          <h3 className="font-medium mb-3">Choose a template</h3>
          <TemplatePicker selected={template} onSelect={setTemplate} />
          <button
            onClick={handleGenerate}
            className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
          >
            Generate (1 credit)
          </button>
        </div>
      )}

      {step === "processing" && (
        <ProcessingStep
          generationId={generationId}
          onComplete={(id) => router.push(`/dashboard/generations/${id}`)}
          onFailed={(err) => { setError(err); setStep("confirm"); }}
        />
      )}
    </div>
  );
}

const funnyMessages = [
  "Polishing your professional summary...",
  "Convincing the AI you're a real person...",
  "Adding just the right amount of synergy...",
  "Translating your experience into corporate...",
  "Removing all mentions of pizza Fridays...",
  "Calculating your ideal buzzword density...",
  "Cross-referencing with LinkedIn stalking data...",
  "Sprinkling in some thought leadership...",
  "Pretending we know what 'proactive' means...",
  "Strategically deploying action verbs...",
  "Making your gap year sound intentional...",
  "Replacing 'helped' with 'spearheaded'...",
  "Ensuring maximum keyword saturation...",
  "Teaching your resume to make eye contact...",
  "Crafting your cover letter origin story...",
  "Giving your bullet points a pep talk...",
  "Optimizing for the robot overlords (ATS)...",
  "Turning coffee consumption into a skill...",
  "Rebranding your Netflix habit as research...",
  "Adding 'detail-oriented' without a typo...",
  "Questioning why they need 10 years of React...",
  "Making sure your margins are chef's kiss...",
  "Rehearsing your 'tell me about yourself'...",
  "Translating 'I Googled it' to 'self-directed learner'...",
  "Wondering if this counts as networking...",
  "Upgrading 'team player' to 'cross-functional collaborator'...",
  "Triple-checking there's no Comic Sans...",
  "Hiding the fact that you cried in the supply closet...",
  "Generating corporate enthusiasm...",
  "Aligning your personal brand with their values...",
];

function useRotatingMessage(intervalMs = 3000) {
  const [index, setIndex] = useState(() =>
    Math.floor(Math.random() * funnyMessages.length)
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => {
        let next: number;
        do {
          next = Math.floor(Math.random() * funnyMessages.length);
        } while (next === prev && funnyMessages.length > 1);
        return next;
      });
    }, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return funnyMessages[index];
}

// Processing step with Supabase Realtime subscription
function ProcessingStep({
  generationId,
  onComplete,
  onFailed,
}: {
  generationId: string | null;
  onComplete: (id: string) => void;
  onFailed: (error: string) => void;
}) {
  useEffect(() => {
    if (!generationId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`generation-${generationId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "generations",
          filter: `id=eq.${generationId}`,
        },
        (payload) => {
          const status = payload.new.status;
          if (status === "completed") {
            channel.unsubscribe();
            trackEvent("generation_completed", {
              generation_id: generationId,
            });
            trackEvent("job_added");
            onComplete(generationId);
          } else if (status === "failed") {
            channel.unsubscribe();
            trackEvent("generation_failed", {
              generation_id: generationId,
            });
            onFailed("Generation failed. Your credit has been refunded. Please try again.");
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [generationId, onComplete, onFailed]);

  const funnyMessage = useRotatingMessage(3000);

  return (
    <div className="text-center py-12">
      <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
      <h2 className="text-lg font-medium mb-2">Tailoring your resume...</h2>
      <p className="text-gray-500 italic min-h-[1.5rem] transition-opacity duration-500">
        {funnyMessage}
      </p>
      <p className="text-gray-400 text-xs mt-4">
        This usually takes about a minute.
      </p>
    </div>
  );
}
