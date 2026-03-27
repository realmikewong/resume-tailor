"use client";

import { useState } from "react";
import Link from "next/link";

export default function StandardNav() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="max-w-6xl mx-auto px-8 py-4">
      <div className="flex justify-between items-center">
        <Link
          href="/"
          className="font-sans text-base font-bold text-foreground tracking-wide"
        >
          Taylor Resum&eacute;
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
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

        {/* Hamburger button (mobile only) */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden font-sans text-foreground p-1"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            {open ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 9h16.5m-16.5 6.75h16.5"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden mt-4 pb-2 border-t border-gray-200 pt-4 flex flex-col gap-3">
          <Link
            href="/blog"
            onClick={() => setOpen(false)}
            className="font-sans text-sm font-medium text-gray-600 hover:text-foreground transition-colors"
          >
            Blog
          </Link>
          <Link
            href="/pricing"
            onClick={() => setOpen(false)}
            className="font-sans text-sm font-medium text-gray-600 hover:text-foreground transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="/auth/login"
            onClick={() => setOpen(false)}
            className="font-sans text-sm font-medium text-gray-600 hover:text-foreground transition-colors"
          >
            Login
          </Link>
          <Link
            href="/auth/login"
            onClick={() => setOpen(false)}
            className="inline-block text-center font-sans text-xs font-semibold tracking-wider uppercase text-white bg-[#1a1a1a] px-4 py-2.5 hover:bg-[#333] transition-colors mt-1"
          >
            Get Started
          </Link>
        </div>
      )}
    </nav>
  );
}
