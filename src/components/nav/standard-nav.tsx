import Link from "next/link";

export default function StandardNav() {
  return (
    <nav className="flex justify-between items-center px-8 py-4 max-w-6xl mx-auto">
      <Link
        href="/"
        className="font-sans text-base font-bold text-foreground tracking-wide"
      >
        Taylor Resum&eacute;
      </Link>
      <div className="flex items-center gap-6">
        <Link
          href="/blog"
          className="font-sans text-sm font-medium text-gray-600 hover:text-foreground transition-colors"
        >
          Blog
        </Link>
        <Link
          href="/pricing"
          className="font-sans text-sm font-medium text-gray-600 hover:text-foreground transition-colors"
        >
          Pricing
        </Link>
        <Link
          href="/auth/login"
          className="font-sans text-sm font-medium text-gray-600 hover:text-foreground transition-colors"
        >
          Login
        </Link>
        <Link
          href="/auth/login"
          className="font-sans text-xs font-semibold tracking-wider uppercase text-white bg-[#1a1a1a] px-4 py-2 hover:bg-[#333] transition-colors"
        >
          Get Started
        </Link>
      </div>
    </nav>
  );
}
