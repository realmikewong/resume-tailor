"use client";

import { FACTOR_LABELS } from "@/lib/ats-schemas";
import type { ATSScoreResponse } from "@/lib/ats-schemas";

function getScoreColor(score: number): string {
  if (score >= 75) return "bg-green-500";
  if (score >= 50) return "bg-yellow-500";
  return "bg-red-500";
}

function getScoreTextColor(score: number): string {
  if (score >= 75) return "text-green-700";
  if (score >= 50) return "text-yellow-700";
  return "text-red-700";
}

function getScoreBgColor(score: number): string {
  if (score >= 75) return "bg-green-50";
  if (score >= 50) return "bg-yellow-50";
  return "bg-red-50";
}

export function ATSScoreCard({
  scores,
  title,
}: {
  scores: ATSScoreResponse;
  title: string;
}) {
  return (
    <div className="border rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>

      {/* Overall Score */}
      <div className={`text-center p-4 rounded-lg mb-6 ${getScoreBgColor(scores.overall_score)}`}>
        <div className={`text-4xl font-bold ${getScoreTextColor(scores.overall_score)}`}>
          {scores.overall_score}
        </div>
        <div className="text-sm text-gray-600 mt-1">Overall ATS Score</div>
      </div>

      {/* Factor Breakdown */}
      <div className="space-y-3">
        {(Object.entries(scores.factors) as [keyof typeof FACTOR_LABELS, { score: number; explanation: string }][]).map(
          ([key, { score, explanation }]) => (
            <div key={key}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700">{FACTOR_LABELS[key]}</span>
                <span className={`font-medium ${getScoreTextColor(score)}`}>
                  {score}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getScoreColor(score)}`}
                  style={{ width: `${score}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{explanation}</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export function ATSScoreCardSkeleton({ title }: { title: string }) {
  return (
    <div className="border rounded-lg p-6 animate-pulse">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="bg-gray-100 rounded-lg p-4 mb-6 text-center">
        <div className="h-10 w-16 bg-gray-200 rounded mx-auto mb-2" />
        <div className="h-4 w-24 bg-gray-200 rounded mx-auto" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i}>
            <div className="flex justify-between mb-1">
              <div className="h-4 w-32 bg-gray-200 rounded" />
              <div className="h-4 w-8 bg-gray-200 rounded" />
            </div>
            <div className="h-2 bg-gray-200 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
