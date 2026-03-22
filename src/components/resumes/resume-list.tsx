"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Resume = {
  id: string;
  file_name: string;
  is_active: boolean;
  created_at: string;
  raw_text_content: string | null;
};

export function ResumeList({
  resumes,
  onPreview,
}: {
  resumes: Resume[];
  onPreview: (resume: Resume) => void;
}) {
  const router = useRouter();

  const setActive = async (resumeId: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Deactivate all
    await supabase
      .from("resumes")
      .update({ is_active: false })
      .eq("user_id", user.id);

    // Activate selected
    await supabase
      .from("resumes")
      .update({ is_active: true })
      .eq("id", resumeId);

    router.refresh();
  };

  if (resumes.length === 0) {
    return <p className="text-gray-500">No resumes uploaded yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {resumes.map((resume) => (
        <li
          key={resume.id}
          className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm"
        >
          <div className="flex items-center gap-3">
            {resume.is_active && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                Active
              </span>
            )}
            <span className="font-medium">{resume.file_name}</span>
            <span className="text-xs text-gray-400">
              {new Date(resume.created_at).toLocaleDateString()}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onPreview(resume)}
              className="text-sm text-blue-600 hover:underline"
            >
              Preview text
            </button>
            {!resume.is_active && (
              <button
                onClick={() => setActive(resume.id)}
                className="text-sm text-gray-600 hover:underline"
              >
                Set as active
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
