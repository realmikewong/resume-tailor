'use client';

import { useState } from 'react';
import type { ExtractedJobFields } from '@/lib/job-extractor-schemas';

interface PasteJobInputProps {
  onExtracted: (fields: ExtractedJobFields) => void;
  onSkip: () => void;
}

const MAX_CHARS = 50000;

export function PasteJobInput({ onExtracted, onSkip }: PasteJobInputProps) {
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleExtract = async () => {
    if (rawText.trim().length < 50) {
      setError('Please paste more of the job posting content.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/extract-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_text: rawText.slice(0, MAX_CHARS) }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Extraction failed');
      }

      const data = await res.json();
      onExtracted(data.fields);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't extract the job details. Please try again or enter them manually."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Paste Job Posting</h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-600 mb-4">
          <li>Find the job posting online</li>
          <li>
            Press <kbd className="px-2 py-0.5 bg-gray-100 border rounded text-sm font-mono">⌘A</kbd>{' '}
            or{' '}
            <kbd className="px-2 py-0.5 bg-gray-100 border rounded text-sm font-mono">Ctrl+A</kbd>{' '}
            to select everything on the page
          </li>
          <li>Paste it in the field below</li>
        </ol>
      </div>

      <div>
        <div className="flex justify-between items-center mb-1">
          <label htmlFor="raw-text" className="text-sm font-medium text-gray-700">
            Job Posting Content
          </label>
          <span className="text-sm text-gray-400">
            {rawText.length.toLocaleString()}/{MAX_CHARS.toLocaleString()}
          </span>
        </div>
        <textarea
          id="raw-text"
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Paste the entire job posting page here..."
          rows={12}
          maxLength={MAX_CHARS}
          className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={loading}
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleExtract}
          disabled={loading || rawText.trim().length < 50}
          className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Extracting...
            </span>
          ) : (
            'Extract Job Details'
          )}
        </button>
        <button
          onClick={onSkip}
          disabled={loading}
          className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          Enter Manually Instead
        </button>
      </div>
    </div>
  );
}
