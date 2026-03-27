"use client";

import { useState } from "react";
import { ATSScoreCard, ATSScoreCardSkeleton } from "@/components/ats/ats-score-card";
import Link from "next/link";
import type { ATSScoreResponse } from "@/lib/ats-schemas";

export function ATSScoreForm() {
  const [resumeContent, setResumeContent] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [scores, setScores] = useState<ATSScoreResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    if (!resumeContent.trim() || !jobDescription.trim()) {
      setError("Please enter both your resume and the job description.");
      return;
    }

    setLoading(true);
    setError(null);
    setScores(null);

    try {
      const res = await fetch("/api/ats-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_content: resumeContent,
          job_description: jobDescription,
          ...(jobTitle && { job_title: jobTitle }),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to analyze resume.");
        return;
      }

      setScores(data);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2 font-sans">
            Your Resume
            <span className="text-gray-400 font-normal ml-2">
              {resumeContent.length}/15,000
            </span>
          </label>
          <textarea
            className="w-full h-64 p-3 border rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Paste your resume text here..."
            value={resumeContent}
            onChange={(e) => setResumeContent(e.target.value)}
            maxLength={15000}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 font-sans">
            Job Description
            <span className="text-gray-400 font-normal ml-2">
              {jobDescription.length}/10,000
            </span>
          </label>
          <textarea
            className="w-full h-64 p-3 border rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Paste the job description here..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            maxLength={10000}
          />
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2 font-sans">
          Target Job Title{" "}
          <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          className="w-full p-3 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g., Senior Software Engineer"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          maxLength={200}
        />
      </div>

      <button
        onClick={handleAnalyze}
        disabled={loading || !resumeContent.trim() || !jobDescription.trim()}
        className="w-full py-3.5 bg-[#1a1a1a] text-white font-sans text-sm font-semibold tracking-wider uppercase hover:bg-[#333] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {loading ? "Analyzing..." : "Analyze My Resume"}
      </button>

      {error && (
        <div className="mt-4 bg-red-50 p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {loading && (
        <div className="mt-8">
          <ATSScoreCardSkeleton title="Your ATS Score" />
        </div>
      )}

      {scores && (
        <div className="mt-8">
          <ATSScoreCard scores={scores} title="Your ATS Score" />

          <div className="mt-8 bg-blue-50 p-6 text-center">
            <h3 className="text-lg font-bold mb-2 font-sans">
              Want to improve this score?
            </h3>
            <p className="text-gray-600 mb-4">
              Sign up for Taylor Resum&eacute; and I&apos;ll automatically optimize
              your resume for any job description.
            </p>
            <Link
              href="/auth/login"
              className="inline-block font-sans text-sm font-semibold tracking-wider uppercase text-white bg-[#1a1a1a] px-9 py-3.5 hover:bg-[#333] transition-colors"
            >
              Start Free — 3 Credits Included
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
