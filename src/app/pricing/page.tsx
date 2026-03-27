import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing | Taylor Resum\u00e9",
  description:
    "Flexible pricing for job seekers. Start free and upgrade when you need more tailored resumes.",
};

const CTA_CLASS =
  "inline-block w-full text-center font-sans text-sm font-semibold tracking-wider uppercase text-white bg-[#1a1a1a] px-9 py-3.5 hover:bg-[#333] transition-colors mt-6";

export default function PricingPage() {
  return (
    <div>
      <h2 className="font-sans text-xs font-semibold tracking-[2.5px] uppercase text-foreground mb-5 pb-1.5 border-b border-gray-300">
        Compensation
      </h2>

      <p className="text-base">
        Flexible packages starting at free. Job searching is expensive enough.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        {/* Free tier */}
        <div className="border border-gray-200 p-8">
          <p className="font-sans text-sm font-semibold tracking-wider uppercase text-foreground">
            Free
          </p>
          <p className="font-sans text-3xl font-bold text-foreground mt-3">
            $0
          </p>
          <p className="text-sm text-gray-500 mt-1">5 credits included</p>
          <p className="text-sm text-gray-700 mt-4">
            Try it out, no card required.
          </p>
          <Link href="/auth/login" className={CTA_CLASS}>
            Get Started
          </Link>
        </div>

        {/* Credit Pack tier */}
        <div className="border border-gray-200 p-8">
          <p className="font-sans text-sm font-semibold tracking-wider uppercase text-foreground">
            Credit Pack
          </p>
          <p className="font-sans text-3xl font-bold text-foreground mt-3">
            $9.99
          </p>
          <p className="text-sm text-gray-500">one-time</p>
          <p className="text-sm text-gray-500 mt-1">13 credits</p>
          <p className="text-sm text-gray-700 mt-4">
            For when you need a few more. Credits never expire.
          </p>
          <Link href="/auth/login" className={CTA_CLASS}>
            Get Credits
          </Link>
        </div>

        {/* Monthly tier */}
        <div className="border border-gray-200 p-8">
          <p className="font-sans text-sm font-semibold tracking-wider uppercase text-foreground">
            Monthly
          </p>
          <p className="font-sans text-3xl font-bold text-foreground mt-3">
            $25
          </p>
          <p className="text-sm text-gray-500">/month</p>
          <p className="text-sm text-gray-500 mt-1">50 credits per month</p>
          <p className="text-sm text-gray-700 mt-4">
            For active job seekers. Cancel anytime.
          </p>
          <Link href="/auth/login" className={CTA_CLASS}>
            Subscribe
          </Link>
        </div>
      </div>

      <p className="text-sm text-gray-500 text-center mt-8">
        Every new account gets 5 free credits. No credit card required to start.
      </p>
    </div>
  );
}
