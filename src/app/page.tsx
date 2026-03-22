import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex justify-between items-center px-8 py-4 max-w-6xl mx-auto">
        <h1 className="text-xl font-bold">Resume Tailor</h1>
        <Link
          href="/auth/login"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
        >
          Get Started
        </Link>
      </nav>

      {/* Hero */}
      <section className="text-center py-24 px-4 max-w-4xl mx-auto">
        <h2 className="text-5xl font-bold mb-6">
          Tailored resumes in minutes, not hours
        </h2>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Upload your resume, paste a job posting, and get a professionally
          tailored resume and cover letter — formatted and ready to send.
        </p>
        <Link
          href="/auth/login"
          className="px-8 py-4 bg-blue-600 text-white rounded-lg text-lg font-medium hover:bg-blue-700"
        >
          Start Free — 3 Credits Included
        </Link>
      </section>

      {/* How it works */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-12">
            How it works
          </h3>
          <div className="grid grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                1
              </div>
              <h4 className="font-bold mb-2">Upload your resume</h4>
              <p className="text-gray-600 text-sm">
                Upload your baseline resume as a Word doc or PDF.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                2
              </div>
              <h4 className="font-bold mb-2">Add a job posting</h4>
              <p className="text-gray-600 text-sm">
                Paste a URL or enter the job details manually.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                3
              </div>
              <h4 className="font-bold mb-2">Download your docs</h4>
              <p className="text-gray-600 text-sm">
                Get a tailored resume and cover letter as Word and PDF.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 max-w-4xl mx-auto px-4">
        <h3 className="text-3xl font-bold text-center mb-12">Pricing</h3>
        <div className="grid grid-cols-3 gap-6">
          <div className="border rounded-lg p-6 text-center">
            <h4 className="font-bold text-lg mb-2">Free</h4>
            <p className="text-3xl font-bold mb-4">$0</p>
            <p className="text-gray-600 text-sm mb-4">3 credits to start</p>
            <Link
              href="/auth/login"
              className="block w-full py-2 bg-gray-100 rounded-md text-sm hover:bg-gray-200"
            >
              Get Started
            </Link>
          </div>
          <div className="border-2 border-blue-600 rounded-lg p-6 text-center">
            <h4 className="font-bold text-lg mb-2">Credit Pack</h4>
            <p className="text-3xl font-bold mb-4">$9.99</p>
            <p className="text-gray-600 text-sm mb-4">10 credits, one-time</p>
            <Link
              href="/auth/login"
              className="block w-full py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
            >
              Buy Credits
            </Link>
          </div>
          <div className="border rounded-lg p-6 text-center">
            <h4 className="font-bold text-lg mb-2">Monthly</h4>
            <p className="text-3xl font-bold mb-4">$14.99</p>
            <p className="text-gray-600 text-sm mb-4">15 credits/month</p>
            <Link
              href="/auth/login"
              className="block w-full py-2 bg-gray-100 rounded-md text-sm hover:bg-gray-200"
            >
              Subscribe
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-gray-400 border-t">
        Resume Tailor &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
