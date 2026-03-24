import Link from "next/link";

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <nav className="flex justify-between items-center px-8 py-4 max-w-6xl mx-auto">
        <Link href="/" className="text-xl font-bold">
          Resume Tailor
        </Link>
        <Link
          href="/auth/login"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
        >
          Get Started
        </Link>
      </nav>
      {children}
    </div>
  );
}
