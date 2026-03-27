import Link from "next/link";
import StickyNav from "@/components/nav/sticky-nav";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <StickyNav />

      <main className="max-w-[780px] mx-auto">
        {/* Header */}
        <header id="resume-header" className="text-center px-6 md:px-12 pt-14 pb-8 border-b-2 border-foreground">
          <h1 className="font-sans text-4xl font-bold tracking-[4px] uppercase text-foreground">
            Taylor Resum&eacute;
          </h1>
          <p className="font-sans text-sm text-gray-500 tracking-wider mt-2">
            Making sure your resum&eacute; does you justice
          </p>
          <div className="font-sans text-xs text-gray-500 mt-3 tracking-wide">
            <a href="mailto:hello@taylorresume.com" className="hover:text-gray-600">hello@taylorresume.com</a>
            <span className="mx-2">|</span>
            <a href="/" className="hover:text-gray-600">taylorresume.com</a>
            <span className="mx-2">|</span>
            <Link
              href="/auth/login"
              className="text-blue-600 font-medium hover:text-blue-800 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </header>

        {/* Objective */}
        <section className="px-6 md:px-12 py-7 border-b border-gray-200">
          <h2 className="font-sans text-xs font-semibold tracking-[2.5px] uppercase text-foreground mb-5 pb-1.5 border-b border-gray-300">
            Objective
          </h2>
          <p className="text-[15px] text-gray-700 leading-relaxed italic">
            You&rsquo;ve done the hard part: building real skills, gaining real
            experience, becoming someone worth hiring. I&rsquo;m here to make sure
            your resum&eacute; does you justice, every time, for every role.
          </p>
        </section>

        {/* Experience */}
        <section className="px-6 md:px-12 py-7 border-b border-gray-200">
          <h2 className="font-sans text-xs font-semibold tracking-[2.5px] uppercase text-foreground mb-5 pb-1.5 border-b border-gray-300">
            Experience
          </h2>

          <div className="mb-7">
            <div className="flex justify-between items-baseline mb-1">
              <h3 className="font-sans text-[15px] font-semibold text-foreground">
                Document Intake Specialist
              </h3>
              <span className="font-sans text-xs text-gray-500">Step 1</span>
            </div>
            <p className="text-sm text-gray-500 mb-2">Getting Started</p>
            <ul className="space-y-1">
              <li className="text-sm text-gray-700 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-gray-500">
                Upload your baseline resum&eacute; as a Word doc or PDF
              </li>
              <li className="text-sm text-gray-700 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-gray-500">
                Your experience, your skills, your story. Securely received.
              </li>
              <li className="text-sm text-gray-700 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-gray-500">
                One upload covers every future application
              </li>
            </ul>
          </div>

          <div className="mb-7">
            <div className="flex justify-between items-baseline mb-1">
              <h3 className="font-sans text-[15px] font-semibold text-foreground">
                Tailoring Analyst
              </h3>
              <span className="font-sans text-xs text-gray-500">Step 2</span>
            </div>
            <p className="text-sm text-gray-500 mb-2">The Work</p>
            <ul className="space-y-1">
              <li className="text-sm text-gray-700 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-gray-500">
                Paste the job posting you&rsquo;re targeting
              </li>
              <li className="text-sm text-gray-700 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-gray-500">
                I&rsquo;ll match your experience to what matters for this role
              </li>
              <li className="text-sm text-gray-700 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-gray-500">
                Every resum&eacute; is unique, because every job posting is
              </li>
            </ul>
          </div>

          <div>
            <div className="flex justify-between items-baseline mb-1">
              <h3 className="font-sans text-[15px] font-semibold text-foreground">
                Delivery Coordinator
              </h3>
              <span className="font-sans text-xs text-gray-500">Step 3</span>
            </div>
            <p className="text-sm text-gray-500 mb-2">The Result</p>
            <ul className="space-y-1">
              <li className="text-sm text-gray-700 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-gray-500">
                Download your tailored resum&eacute; and cover letter
              </li>
              <li className="text-sm text-gray-700 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-gray-500">
                Formatted, polished, and ready to send
              </li>
              <li className="text-sm text-gray-700 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-gray-500">
                Word and PDF formats included
              </li>
            </ul>
          </div>
        </section>

        {/* Volunteer Work */}
        <section className="px-6 md:px-12 py-7 border-b border-gray-200">
          <h2 className="font-sans text-xs font-semibold tracking-[2.5px] uppercase text-foreground mb-5 pb-1.5 border-b border-gray-300">
            Volunteer Work
          </h2>
          <h3 className="font-sans text-[15px] font-semibold text-foreground mb-1">
            ATS Compatibility Analyst
          </h3>
          <p className="text-sm text-gray-500 mb-2">
            Community Service. Free, no sign-up required.
          </p>
          <p className="text-sm text-gray-700 leading-relaxed">
            Not sure how your resum&eacute; stacks up against applicant tracking
            systems? Check your ATS compatibility score, on the house.
          </p>
          <Link
            href="/tools/ats-score"
            className="inline-block mt-3 font-sans text-sm font-medium text-blue-600 border-b border-blue-600 pb-px hover:text-blue-800 hover:border-blue-800 transition-colors"
          >
            Check Your Score Free &rarr;
          </Link>
        </section>

        {/* Compensation */}
        <section className="px-6 md:px-12 py-7 border-b border-gray-200">
          <h2 className="font-sans text-xs font-semibold tracking-[2.5px] uppercase text-foreground mb-5 pb-1.5 border-b border-gray-300">
            Compensation
          </h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            Flexible packages starting at free. Competitive rates because job
            searching is expensive enough.
          </p>
          <Link
            href="/pricing"
            className="inline-block mt-2 font-sans text-sm font-medium text-blue-600 border-b border-blue-600 pb-px hover:text-blue-800 hover:border-blue-800 transition-colors"
          >
            View Pricing &rarr;
          </Link>
        </section>

        {/* CTA Footer */}
        <section className="text-center px-6 md:px-12 py-9 border-t-2 border-foreground">
          <p className="text-[15px] text-gray-700 mb-5 leading-relaxed">
            References available upon request. Or just try it: your first 3
            tailored resum&eacute;s are on me.
          </p>
          <Link
            href="/auth/login"
            className="inline-block font-sans text-sm font-semibold tracking-wider uppercase text-white bg-[#1a1a1a] px-9 py-3.5 hover:bg-[#333] transition-colors"
          >
            Get Started Free
          </Link>
        </section>

        {/* Footer */}
        <footer className="text-center px-6 md:px-12 py-5 font-sans text-[11px] text-gray-300 tracking-wide">
          &copy; {new Date().getFullYear()} Taylor Resum&eacute;. All rights
          reserved.
        </footer>
      </main>
    </div>
  );
}
