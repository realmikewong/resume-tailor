"use client";

import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/analytics";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function DownloadButtons({
  filePaths,
  companyName,
}: {
  filePaths: {
    resume_word: string | null;
    resume_pdf: string | null;
    cover_letter_word: string | null;
    cover_letter_pdf: string | null;
  };
  companyName?: string;
}) {
  const slug = companyName ? slugify(companyName) : null;
  const handleDownload = async (path: string, fileName: string, docType: "resume" | "cover_letter", fileFormat: "word" | "pdf") => {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from("documents")
      .download(path);

    if (error || !data) return;

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    trackEvent(docType === "resume" ? "resume_downloaded" : "cover_letter_downloaded", {
      file_format: fileFormat,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium mb-2">Resume</h3>
        <div className="flex flex-col sm:flex-row gap-2">
          {filePaths.resume_word && (
            <button
              onClick={() => handleDownload(filePaths.resume_word!, slug ? `resume-${slug}.docx` : "resume.docx", "resume", "word")}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              Download Word
            </button>
          )}
          {filePaths.resume_pdf && (
            <button
              onClick={() => handleDownload(filePaths.resume_pdf!, slug ? `resume-${slug}.pdf` : "resume.pdf", "resume", "pdf")}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
            >
              Download PDF
            </button>
          )}
        </div>
      </div>
      <div>
        <h3 className="font-medium mb-2">Cover Letter</h3>
        <div className="flex flex-col sm:flex-row gap-2">
          {filePaths.cover_letter_word && (
            <button
              onClick={() => handleDownload(filePaths.cover_letter_word!, slug ? `cover-letter-${slug}.docx` : "cover-letter.docx", "cover_letter", "word")}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              Download Word
            </button>
          )}
          {filePaths.cover_letter_pdf && (
            <button
              onClick={() => handleDownload(filePaths.cover_letter_pdf!, slug ? `cover-letter-${slug}.pdf` : "cover-letter.pdf", "cover_letter", "pdf")}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
            >
              Download PDF
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
