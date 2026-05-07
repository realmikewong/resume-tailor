"use client";

import { useState } from "react";

export type Prefill = {
  jobDescription: string;
  resumeContent: string;
  companyName: string;
  jobTitle: string;
} | null;

interface ThankYouEmailFormProps {
  prefill: Prefill;
}

export function ThankYouEmailForm({ prefill }: ThankYouEmailFormProps) {
  const [jobDescription, setJobDescription] = useState(prefill?.jobDescription ?? "");
  const [resumeContent, setResumeContent] = useState(prefill?.resumeContent ?? "");
  const [interviewerName, setInterviewerName] = useState("");
  const [interviewerTitle, setInterviewerTitle] = useState("");
  const [memorableMoment, setMemorableMoment] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [emailContent, setEmailContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (
      !jobDescription.trim() ||
      !resumeContent.trim() ||
      !interviewerName.trim() ||
      !interviewerTitle.trim() ||
      !memorableMoment.trim()
    ) {
      setError("Please fill in all fields.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setEmailContent("");

    try {
      const res = await fetch("/api/thank-you-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_description: jobDescription,
          resume_content: resumeContent,
          interviewer_name: interviewerName,
          interviewer_title: interviewerTitle,
          memorable_moment: memorableMoment,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      if (!res.body) {
        setError("No response body received. Please try again.");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setEmailContent((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(emailContent);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      setCopyError(true);
      setTimeout(() => setCopyError(false), 2000);
    }
  }

  const showPrefillBanner = prefill && !isEditing;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {showPrefillBanner ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
          <span className="text-green-800 font-medium text-sm">
            ✓ {prefill.jobTitle} at {prefill.companyName} — job &amp; resume loaded
          </span>
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="text-sm text-gray-500 hover:text-gray-700 ml-4"
          >
            {isEditing ? "Hide ▴" : "Edit ▾"}
          </button>
        </div>
      ) : (
        <>
          {prefill && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Hide ▴
              </button>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-2 font-sans">
              Job Description
              <span className="text-gray-400 font-normal ml-2">
                {jobDescription.length}/10,000
              </span>
            </label>
            <textarea
              className="w-full h-40 p-3 border rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Paste the job description here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              maxLength={10000}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 font-sans">
              Your Resume
              <span className="text-gray-400 font-normal ml-2">
                {resumeContent.length}/8,000
              </span>
            </label>
            <textarea
              className="w-full h-40 p-3 border rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Paste your resume text here..."
              value={resumeContent}
              onChange={(e) => setResumeContent(e.target.value)}
              maxLength={8000}
            />
          </div>
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2 font-sans">
            Interviewer Name
          </label>
          <input
            type="text"
            className="w-full p-3 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g. Sarah Chen"
            value={interviewerName}
            onChange={(e) => setInterviewerName(e.target.value)}
            maxLength={100}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 font-sans">
            Their Title / Role
          </label>
          <input
            type="text"
            className="w-full p-3 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g. Engineering Manager"
            value={interviewerTitle}
            onChange={(e) => setInterviewerTitle(e.target.value)}
            maxLength={200}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 font-sans">
          Memorable Moment from the Interview
          <span className="text-gray-400 font-normal ml-2">
            {memorableMoment.length}/1,000
          </span>
        </label>
        <textarea
          className="w-full h-28 p-3 border rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g. We talked about the team's shift to microservices and how it aligns with my background in distributed systems..."
          value={memorableMoment}
          onChange={(e) => setMemorableMoment(e.target.value)}
          maxLength={1000}
        />
      </div>

      <button
        type="submit"
        disabled={isGenerating}
        className="w-full py-3.5 bg-[#1a1a1a] text-white font-sans text-sm font-semibold tracking-wider uppercase hover:bg-[#333] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {isGenerating ? "Writing..." : "Generate Thank You Email"}
      </button>

      {error && (
        <div className="bg-red-50 p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {(isGenerating || emailContent) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900 font-sans">
              Your Thank You Email
            </h3>
            {emailContent && !isGenerating && (
              <button
                type="button"
                onClick={handleCopy}
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                {isCopied ? "✓ Copied!" : copyError ? "Copy failed" : "Copy to Clipboard"}
              </button>
            )}
          </div>
          <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans leading-relaxed">
            {emailContent}
            {isGenerating && (
              <span className="animate-pulse text-gray-400">▌</span>
            )}
          </pre>
        </div>
      )}
    </form>
  );
}
