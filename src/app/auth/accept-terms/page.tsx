// src/app/auth/accept-terms/page.tsx
import fs from "fs";
import path from "path";
import Link from "next/link";
import { marked } from "marked";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { acceptTerms } from "./actions";

export default async function AcceptTermsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Forward already-accepted users directly to the dashboard
  const { data: profile } = await supabase
    .from("profiles")
    .select("terms_accepted_at")
    .eq("user_id", user.id)
    .single();

  if (profile?.terms_accepted_at) redirect("/dashboard");

  const filePath = path.join(process.cwd(), "content", "legal", "terms-of-use.md");
  const raw = fs.readFileSync(filePath, "utf-8");
  const html = marked(raw) as string;

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[560px] flex flex-col gap-6">
        {/* Wordmark */}
        <p className="font-sans text-xl font-bold tracking-tight text-center">
          Taylor Resum&eacute;
        </p>

        {/* Heading */}
        <h1 className="font-sans text-2xl font-bold text-center">
          Before you get started
        </h1>

        {/* Subtext */}
        <p className="font-serif text-base text-gray-600 text-center">
          Please review and accept our Terms of Use to continue.
        </p>

        {/* Scrollable terms box — h-80 = 320px per spec; overflow-y-scroll always shows scrollbar */}
        <div
          className="h-80 overflow-y-scroll border border-gray-200 rounded p-4 prose prose-gray prose-sm max-w-none prose-headings:font-sans prose-p:font-serif prose-li:font-serif"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {/* I Agree form */}
        <form action={acceptTerms}>
          <button
            type="submit"
            className="w-full bg-[#1a1a1a] text-white font-sans uppercase tracking-widest text-sm py-3 rounded hover:bg-black transition-colors"
          >
            I Agree
          </button>
        </form>

        {/* Fine print */}
        <p className="font-sans text-[11px] text-gray-400 text-center">
          By clicking I Agree, you confirm you are at least 16 years old and
          accept our{" "}
          <Link href="/terms" className="underline hover:text-gray-600">
            Terms of Use
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-gray-600">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
