import Link from "next/link";

export function BlogCta() {
  return (
    <div className="bg-blue-50 rounded-xl p-8 mt-12 text-center">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Ready to improve your resume?
      </h2>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          href="/tools/ats-score"
          className="inline-flex items-center justify-center px-6 py-3 border-2 border-blue-600 text-blue-600 font-medium rounded-lg hover:bg-blue-600 hover:text-white transition-colors"
        >
          Free ATS Score Checker
        </Link>
        <Link
          href="/auth/login"
          className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Start Tailoring Your Resume
        </Link>
      </div>
    </div>
  );
}
