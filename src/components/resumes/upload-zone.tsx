"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export function UploadZone() {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleFile = useCallback(async (file: File) => {
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload-resume", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
      setUploading(false);
      return;
    }

    setUploading(false);
    router.refresh();
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
      {uploading ? (
        <p className="text-gray-500">Uploading and extracting text...</p>
      ) : (
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
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
    </div>
  );
}
