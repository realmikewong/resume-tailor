import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing | Taylor Resumé",
  description: "Honest pricing for job seekers. Start free, no credit card required.",
};

const FEATURES = [
  "ATS score checker",
  "Download Word (.docx)",
  "Download PDF",
  "Job status tracker",
];

const SOLID_CTA =
  "block w-full text-center font-sans text-xs font-semibold tracking-[1.5px] uppercase bg-[#1a1a1a] text-white px-4 py-3 hover:bg-[#333] transition-colors mt-6";

const OUTLINE_CTA =
  "block w-full text-center font-sans text-xs font-semibold tracking-[1.5px] uppercase border border-gray-300 text-foreground px-4 py-3 hover:border-gray-500 transition-colors mt-6";

export default function PricingPage() {
  return (
    <div>
      {/* Header */}
      <p className="font-sans text-[11px] font-semibold tracking-[2.5px] uppercase text-gray-500 mb-3">
        Pricing
      </p>
      <h1 className="font-sans text-3xl font-bold text-foreground mb-3">
        Honest pricing for honest job seekers.
      </h1>
      <p className="font-serif text-base text-gray-600 leading-relaxed max-w-[520px] mb-10">
        Job searching is expensive enough. We keep our prices in check so you
        can focus on landing the role, not watching the meter.
      </p>

      {/* Pricing grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 bg-gray-200 border border-gray-200">

        {/* Free */}
        <div className="bg-white p-8 flex flex-col">
          <div className="h-[22px]" />
          <p className="font-sans text-xs font-semibold tracking-[2px] uppercase text-gray-500 mb-4">
            FREE
          </p>
          <p className="font-sans text-4xl font-bold text-foreground leading-none">
            $0
          </p>
          <p className="font-sans text-sm text-gray-400 mt-1">
            no credit card required
          </p>
          <p className="font-sans text-[11px] text-gray-500 mt-3 mb-6 pb-6 border-b border-gray-200">
            Free to get started
          </p>
          <p className="font-sans text-[28px] font-bold text-foreground leading-none mb-1">
            10
          </p>
          <p className="font-sans text-xs text-gray-500 mb-5 pb-5 border-b border-gray-200">
            resum&eacute;s + cover letters
          </p>
          <ul className="flex-1 space-y-0">
            {FEATURES.map((feature, i) => (
              <li
                key={feature}
                className={`font-sans text-sm text-gray-700 py-1.5 flex items-start gap-2 ${
                  i < FEATURES.length - 1 ? "border-b border-gray-100" : ""
                }`}
              >
                <span aria-hidden="true" className="font-sans text-xs text-foreground mt-0.5 shrink-0">
                  ✓
                </span>
                {feature}
              </li>
            ))}
          </ul>
          <Link href="/auth/login" className={OUTLINE_CTA}>
            Get Started Free
          </Link>
        </div>

        {/* Pro */}
        <div className="bg-white p-8 flex flex-col">
          <div className="h-[22px]" />
          <p className="font-sans text-xs font-semibold tracking-[2px] uppercase text-gray-500 mb-4">
            PRO
          </p>
          <p className="font-sans text-4xl font-bold text-foreground leading-none">
            $7.99
          </p>
          <p className="font-sans text-sm text-gray-400 mt-1">
            /month &middot; cancel anytime
          </p>
          <p className="font-sans text-[11px] text-gray-500 mt-3 mb-6 pb-6 border-b border-gray-200">
            ~$0.13 per resum&eacute; + cover letter
          </p>
          <p className="font-sans text-[28px] font-bold text-foreground leading-none mb-1">
            60
          </p>
          <p className="font-sans text-xs text-gray-500 mb-5 pb-5 border-b border-gray-200">
            resum&eacute;s + cover letters / mo
          </p>
          <ul className="flex-1 space-y-0">
            {FEATURES.map((feature, i) => (
              <li
                key={feature}
                className={`font-sans text-sm text-gray-700 py-1.5 flex items-start gap-2 ${
                  i < FEATURES.length - 1 ? "border-b border-gray-100" : ""
                }`}
              >
                <span aria-hidden="true" className="font-sans text-xs text-foreground mt-0.5 shrink-0">
                  ✓
                </span>
                {feature}
              </li>
            ))}
          </ul>
          <Link href="/auth/login" className={SOLID_CTA}>
            Get Pro
          </Link>
        </div>

        {/* Ultimate */}
        <div className="bg-[#fafaf9] p-8 flex flex-col">
          <span className="inline-block font-sans text-[10px] font-bold tracking-[1.5px] uppercase bg-[#1a1a1a] text-white px-2 py-0.5 mb-4 self-start">
            Best Value
          </span>
          <p className="font-sans text-xs font-semibold tracking-[2px] uppercase text-gray-500 mb-4">
            ULTIMATE
          </p>
          <p className="font-sans text-4xl font-bold text-foreground leading-none">
            $19.99
          </p>
          <p className="font-sans text-sm text-gray-400 mt-1">
            /month &middot; cancel anytime
          </p>
          <p className="font-sans text-[11px] text-gray-500 mt-3 mb-6 pb-6 border-b border-gray-200">
            ~$0.07 per resum&eacute; + cover letter
          </p>
          <p className="font-sans text-[28px] font-bold text-foreground leading-none mb-1">
            300
          </p>
          <p className="font-sans text-xs text-gray-500 mb-5 pb-5 border-b border-gray-200">
            resum&eacute;s + cover letters / mo
          </p>
          <ul className="flex-1 space-y-0">
            {FEATURES.map((feature, i) => (
              <li
                key={feature}
                className={`font-sans text-sm text-gray-700 py-1.5 flex items-start gap-2 ${
                  i < FEATURES.length - 1 ? "border-b border-gray-100" : ""
                }`}
              >
                <span aria-hidden="true" className="font-sans text-xs text-foreground mt-0.5 shrink-0">
                  ✓
                </span>
                {feature}
              </li>
            ))}
          </ul>
          <Link href="/auth/login" className={SOLID_CTA}>
            Get Ultimate
          </Link>
        </div>

      </div>

      {/* Reset policy callout */}
      <div className="border-l-[3px] border-gray-300 bg-gray-50 px-5 py-4 mt-6">
        <p className="text-sm text-gray-500 leading-relaxed">
          <strong className="font-sans font-semibold text-gray-700">
            Credits reset monthly.
          </strong>{" "}
          Unused credits don&rsquo;t roll over &mdash; apply them now and keep
          your job search moving. Every plan includes the job status tracker so
          you can manage all your applications in one place.
        </p>
      </div>

      {/* Footer */}
      <div className="text-center mt-8 space-y-1">
        <p className="font-sans text-sm text-gray-400">
          Every new account starts with 10 free credits. No credit card
          required.
        </p>
        <p className="font-sans text-sm text-gray-400">
          Questions?{" "}
          <a
            href="mailto:hello@taylorresume.com"
            className="underline hover:text-gray-600 transition-colors"
          >
            hello@taylorresume.com
          </a>
        </p>
      </div>
    </div>
  );
}
