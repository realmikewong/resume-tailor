"use client";

import { useState } from "react";

type ScrapedFields = {
  company_name: string;
  job_title: string;
  job_description: string;
  pay_range_low: number | null;
  pay_range_high: number | null;
  job_location: string | null;
  location_type: "remote" | "hybrid" | "on-site" | null;
};

export function ScrapeInput({
  onScraped,
  onSkip,
}: {
  onScraped: (fields: ScrapedFields, url: string) => void;
  onSkip: () => void;
}) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    onScraped(data.fields, url);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleScrape} className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/job-posting"
          required
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Scraping..." : "Fetch Job Details"}
        </button>
      </form>
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md">
          <p className="text-sm text-yellow-800">{error}</p>
        </div>
      )}
      <button
        onClick={onSkip}
        className="text-sm text-gray-500 hover:underline"
      >
        Enter job details manually instead
      </button>
    </div>
  );
}
