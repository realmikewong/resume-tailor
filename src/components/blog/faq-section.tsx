"use client";

import { useState } from "react";
import type { FaqItem } from "@/lib/blog";

export function FaqSection({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="mt-12">
      <h2 className="font-sans text-2xl font-bold text-gray-900 mb-6">
        Frequently Asked Questions
      </h2>
      <div className="divide-y border rounded-lg overflow-hidden">
        {items.map((item, index) => (
          <div key={index}>
            <button
              onClick={() => toggle(index)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
            >
              <span className="font-sans font-medium text-gray-900">{item.q}</span>
              <span className="ml-4 flex-shrink-0 text-gray-500">
                {openIndex === index ? (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 15l7-7 7 7"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                )}
              </span>
            </button>
            {openIndex === index && (
              <div className="px-5 pb-4 text-gray-600 leading-relaxed">
                {item.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
