import { ATSScoreForm } from "@/components/ats/ats-score-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free ATS Resume Score Checker | Resume Tailor",
  description:
    "Check how well your resume matches a job description with our free ATS scoring tool. Get an 8-factor breakdown of your resume's ATS compatibility.",
};

export default function ATSScorePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-4">Free ATS Resume Score Checker</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          See how well your resume matches a job description. Get an 8-factor
          breakdown of your ATS compatibility score — completely free.
        </p>
      </div>

      <ATSScoreForm />
    </div>
  );
}
