"use client";

import { ATSScoreCard } from "./ats-score-card";
import type { ATSScoreResponse } from "@/lib/ats-schemas";

export function ATSComparison({
  baseScores,
  tailoredScores,
}: {
  baseScores: ATSScoreResponse | null;
  tailoredScores: ATSScoreResponse | null;
}) {
  if (!baseScores && !tailoredScores) return null;

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-4">ATS Score Comparison</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {baseScores ? (
          <ATSScoreCard scores={baseScores} title="Your Original Resume" />
        ) : (
          <div className="border rounded-lg p-6 flex items-center justify-center text-gray-400 text-sm">
            Original resume text not available for scoring.
          </div>
        )}
        {tailoredScores && (
          <ATSScoreCard scores={tailoredScores} title="Tailored Resume" />
        )}
      </div>
    </div>
  );
}
