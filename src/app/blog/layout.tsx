import Link from "next/link";

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-blue-600">
            Resume Tailor
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="/blog"
              className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
            >
              Blog
            </Link>
            <Link
              href="/tools/ats-score"
              className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
            >
              ATS Score Checker
            </Link>
            <Link
              href="/auth/login"
              className="text-sm font-medium px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
