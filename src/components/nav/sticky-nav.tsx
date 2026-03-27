"use client";

import { useEffect, useState } from "react";
import StandardNav from "./standard-nav";

export default function StickyNav() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const header = document.getElementById("resume-header");
    if (!header) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(!entry.isIntersecting);
      },
      { threshold: 0 }
    );

    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 transition-transform duration-300 ${
        visible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <StandardNav />
    </div>
  );
}
