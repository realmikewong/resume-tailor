"use client";

import { useEffect, useState } from "react";
import { ATSComparison } from "./ats-comparison";
import { ATSScoreCardSkeleton } from "./ats-score-card";
import type { ATSScoreResponse } from "@/lib/ats-schemas";

export function ATSScoreLoader({
  generationId,
  baseResumeContent,
  tailoredResumeContent,
  jobDescription,
  jobTitle,
  existingBaseScores,
  existingTailoredScores,
}: {
  generationId: string;
  baseResumeContent: string | null;
  tailoredResumeContent: string;
  jobDescription: string;
  jobTitle?: string;
  existingBaseScores: ATSScoreResponse | null;
  existingTailoredScores: ATSScoreResponse | null;
}) {
  const [baseScores, setBaseScores] = useState<ATSScoreResponse | null>(existingBaseScores);
  const [tailoredScores, setTailoredScores] = useState<ATSScoreResponse | null>(existingTailoredScores);
  const [loading, setLoading] = useState(!existingBaseScores || !existingTailoredScores);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existingBaseScores && existingTailoredScores) return;

    async function fetchScores() {
      setLoading(true);
      setError(null);

      try {
        const requests: Promise<void>[] = [];

        // Score base resume if available and not already scored
        if (baseResumeContent && !existingBaseScores) {
          requests.push(
            fetch("/api/ats-score", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                resume_content: baseResumeContent,
                job_description: jobDescription,
                job_title: jobTitle,
              }),
            })
              .then((res) => res.json())
              .then((data) => {
                if (data.error) throw new Error(data.error);
                setBaseScores(data);
              })
          );
        }

        // Score tailored resume if not already scored
        if (!existingTailoredScores) {
          requests.push(
            fetch("/api/ats-score", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                resume_content: tailoredResumeContent,
                job_description: jobDescription,
                job_title: jobTitle,
              }),
            })
              .then((res) => res.json())
              .then((data) => {
                if (data.error) throw new Error(data.error);
                setTailoredScores(data);
              })
          );
        }

        await Promise.all(requests);
      } catch (err) {
        console.error("ATS scoring failed:", err);
        setError("ATS scores unavailable — try refreshing the page.");
      } finally {
        setLoading(false);
      }
    }

    fetchScores();
  }, [generationId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist scores after they're computed
  useEffect(() => {
    if (!baseScores && !tailoredScores) return;
    if (existingBaseScores && existingTailoredScores) return;

    const body: Record<string, ATSScoreResponse> = {};
    if (baseScores && !existingBaseScores) body.base_ats_scores = baseScores;
    if (tailoredScores && !existingTailoredScores) body.tailored_ats_scores = tailoredScores;

    if (Object.keys(body).length === 0) return;

    fetch(`/api/generations/${generationId}/ats-scores`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch((err) => console.error("Failed to persist ATS scores:", err));
  }, [baseScores, tailoredScores, generationId, existingBaseScores, existingTailoredScores]);

  if (error) {
    return (
      <div className="mt-8 bg-yellow-50 p-4 rounded-lg">
        <p className="text-yellow-700 text-sm">{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">ATS Score Comparison</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ATSScoreCardSkeleton title="Your Original Resume" />
          <ATSScoreCardSkeleton title="Tailored Resume" />
        </div>
      </div>
    );
  }

  return <ATSComparison baseScores={baseScores} tailoredScores={tailoredScores} />;
}
