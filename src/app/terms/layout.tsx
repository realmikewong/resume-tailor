import type { Metadata } from "next";
import StandardNav from "@/components/nav/standard-nav";

export const metadata: Metadata = {
  title: "Terms of Use | Taylor Resumé",
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white sticky top-0 z-10">
        <StandardNav />
      </header>
      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
