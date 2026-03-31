"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type UploadStatus = "idle" | "uploading" | "extracting" | "done" | "error";

export function UploadZone() {
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleFile = useCallback(async (file: File) => {
    setStatus("uploading");
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    // Simulate extracting phase mid-flight so the user sees both steps
    const uploadTimer = setTimeout(() => setStatus("extracting"), 800);

    const res = await fetch("/api/upload-resume", {
      method: "POST",
      body: formData,
    });

    clearTimeout(uploadTimer);
    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
      setStatus("error");
      return;
    }

    setStatus("done");
    router.refresh();

    // Reset to idle after a brief success moment
    setTimeout(() => setStatus("idle"), 2500);
  }, [router]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-lg p-4 md:p-8 text-center ${
        dragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
      }`}
    >
      {status === "uploading" && (
        <div className="flex flex-col items-center gap-2">
          <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-gray-500">Uploading...</p>
        </div>
      )}

      {status === "extracting" && (
        <div className="flex flex-col items-center gap-2">
          <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-gray-500">Extracting text...</p>
        </div>
      )}

      {status === "done" && (
        <div className="flex flex-col items-center gap-2">
          <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-sm text-green-600 font-medium">Resume uploaded successfully</p>
        </div>
      )}

      {(status === "idle" || status === "error") && (
        <>
          <p className="text-gray-500 mb-2">
            Drag and drop your resume here, or
          </p>
          <label className="cursor-pointer text-blue-600 hover:underline">
            browse files
            <input
              type="file"
              accept=".pdf,.docx"
              onChange={handleChange}
              className="hidden"
            />
          </label>
          <p className="text-xs text-gray-400 mt-2">
            Supports .docx and .pdf
          </p>
        </>
      )}

      {status === "error" && error && (
        <p className="text-red-600 text-sm mt-2">{error}</p>
      )}
    </div>
  );
}
