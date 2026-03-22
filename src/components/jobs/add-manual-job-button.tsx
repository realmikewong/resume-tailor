"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function AddManualJobButton() {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Create job record
    const { data: job } = await supabase
      .from("jobs")
      .insert({
        user_id: user.id,
        company_name: form.get("company_name") as string,
        job_title: form.get("job_title") as string,
        job_description: (form.get("job_description") as string) || "N/A",
        source_url: (form.get("source_url") as string) || null,
        location_type: (form.get("location_type") as string) || null,
        scrape_status: "manual",
      })
      .select()
      .single();

    if (job) {
      // Create application record (no generation)
      await supabase.from("applications").insert({
        user_id: user.id,
        job_id: job.id,
        generation_id: null,
        status: "applied",
        date_applied: (form.get("date_applied") as string) || null,
      });
    }

    setSaving(false);
    setOpen(false);
    router.refresh();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
      >
        + Track a Job
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="font-bold text-lg mb-4">Track a Job</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input name="company_name" placeholder="Company Name *" required
            className="w-full px-3 py-2 border rounded-md text-sm" />
          <input name="job_title" placeholder="Job Title *" required
            className="w-full px-3 py-2 border rounded-md text-sm" />
          <input name="source_url" placeholder="Job URL (optional)"
            className="w-full px-3 py-2 border rounded-md text-sm" />
          <select name="location_type" className="w-full px-3 py-2 border rounded-md text-sm">
            <option value="">Location Type...</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="on-site">On-site</option>
          </select>
          <div>
            <label className="block text-xs font-medium mb-1">Date Applied</label>
            <input name="date_applied" type="date"
              className="w-full px-3 py-2 border rounded-md text-sm" />
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <button type="button" onClick={() => setOpen(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50">
              {saving ? "Saving..." : "Add to Tracker"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
