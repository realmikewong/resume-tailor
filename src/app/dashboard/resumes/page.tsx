"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UploadZone } from "@/components/resumes/upload-zone";
import { ResumeList } from "@/components/resumes/resume-list";
import { TextPreview } from "@/components/resumes/text-preview";

type Resume = {
  id: string;
  file_name: string;
  is_active: boolean;
  created_at: string;
  raw_text_content: string | null;
};

export default function ResumesPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [previewResume, setPreviewResume] = useState<Resume | null>(null);

  const loadResumes = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("resumes")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setResumes(data);
  };

  useEffect(() => {
    loadResumes();
  }, []);

  // Re-load when the page regains focus (after router.refresh())
  useEffect(() => {
    const handleFocus = () => loadResumes();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Resumes</h1>
      <div className="mb-8">
        <UploadZone />
      </div>
      <ResumeList resumes={resumes} onPreview={setPreviewResume} />
      {previewResume?.raw_text_content && (
        <TextPreview
          text={previewResume.raw_text_content}
          onClose={() => setPreviewResume(null)}
        />
      )}
    </div>
  );
}
