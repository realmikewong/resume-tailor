"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

export default function StandardNav() {
  const [open, setOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
    }
    if (toolsOpen) {
      document.addEventListener("mousedown", handleMouseDown);
    }
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [toolsOpen]);

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
            href="/roadmap"
            className="font-sans text-sm font-medium text-gray-600 hover:text-foreground transition-colors"
          >
            Roadmap
          </Link>

          {/* Tools dropdown */}
          <div className="relative" ref={toolsRef}>
            <button
              onClick={() => setToolsOpen(!toolsOpen)}
              className="font-sans text-sm font-medium text-gray-600 hover:text-foreground transition-colors flex items-center gap-1"
            >
              Tools
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {toolsOpen && (
              <div className="absolute top-full left-0 mt-2 w-52 bg-white border border-gray-200 shadow-sm py-1 z-10">
                <Link
                  href="/tools/ats-score"
                  onClick={() => setToolsOpen(false)}
                  className="block px-4 py-2 font-sans text-sm text-gray-600 hover:text-foreground hover:bg-gray-50 transition-colors"
                >
                  ATS Score Checker
                </Link>
                <Link
                  href="/tools/thank-you-email"
                  onClick={() => setToolsOpen(false)}
                  className="block px-4 py-2 font-sans text-sm text-gray-600 hover:text-foreground hover:bg-gray-50 transition-colors"
                >
                  Thank You Email
                </Link>
              </div>
            )}
          </div>

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
          onClick={() => {
            setToolsOpen(false);
            setOpen(!open);
          }}
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
            href="/roadmap"
            onClick={() => setOpen(false)}
            className="font-sans text-sm font-medium text-gray-600 hover:text-foreground transition-colors"
          >
            Roadmap
          </Link>

          {/* Tools accordion */}
          <div>
            <button
              onClick={() => setToolsOpen(!toolsOpen)}
              className="font-sans text-sm font-medium text-gray-600 hover:text-foreground transition-colors w-full text-left flex items-center justify-between"
            >
              Tools
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d={toolsOpen ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}
                />
              </svg>
            </button>
            {toolsOpen && (
              <div className="mt-2 pl-3 flex flex-col gap-2">
                <Link
                  href="/tools/ats-score"
                  onClick={() => { setOpen(false); setToolsOpen(false); }}
                  className="font-sans text-sm font-medium text-gray-600 hover:text-foreground transition-colors"
                >
                  ATS Score Checker
                </Link>
                <Link
                  href="/tools/thank-you-email"
                  onClick={() => { setOpen(false); setToolsOpen(false); }}
                  className="font-sans text-sm font-medium text-gray-600 hover:text-foreground transition-colors"
                >
                  Thank You Email
                </Link>
              </div>
            )}
          </div>

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
