"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics";

export function PageViewTracker() {
  const pathname = usePathname();
  const isFirstRender = useRef(true);
  const lastPathname = useRef<string | null>(null);

  useEffect(() => {
    // Skip initial mount — the Google Tag handles the first page_view on load.
    // Only fire for subsequent SPA navigations.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      lastPathname.current = pathname;
      return;
    }

    if (pathname === lastPathname.current) return;
    lastPathname.current = pathname;

    trackEvent("page_view", {
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname]);

  return null;
}
