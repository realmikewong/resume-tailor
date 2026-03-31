"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trackEvent } from "@/lib/analytics";

type Application = {
  id: string;
  status: string;
  date_applied: string | null;
  interview_date: string | null;
  notes: string | null;
  created_at: string;
  jobs: {
    company_name: string;
    job_title: string;
    job_location: string | null;
    location_type: string | null;
  };
  generation_id: string | null;
};

const statusOptions = [
  "generated",
  "applied",
  "interviewing",
  "offered",
  "rejected",
  "withdrawn",
];

export function JobTrackerTable({
  applications,
}: {
  applications: Application[];
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const router = useRouter();

  const filtered =
    filter === "all"
      ? applications
      : applications.filter((a) => a.status === filter);

  const updateStatus = async (appId: string, newStatus: string) => {
    const supabase = createClient();
    await supabase
      .from("applications")
      .update({ status: newStatus })
      .eq("id", appId);
    trackEvent("job_status_updated", { status: newStatus });
    router.refresh();
  };

  const updateField = async (
    appId: string,
    field: string,
    value: string | null
  ) => {
    const supabase = createClient();
    await supabase
      .from("applications")
      .update({ [field]: value })
      .eq("id", appId);
    router.refresh();
  };

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1 rounded text-sm ${
            filter === "all" ? "bg-blue-600 text-white" : "bg-gray-100"
          }`}
        >
          All
        </button>
        {statusOptions.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded text-sm capitalize ${
              filter === s ? "bg-blue-600 text-white" : "bg-gray-100"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-500 py-8 text-center">No applications yet.</p>
      ) : (
        <div className="overflow-x-auto">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium">Company</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Title</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium hidden md:table-cell">Date Applied</th>
                <th className="text-left px-4 py-3 text-sm font-medium hidden md:table-cell">Added</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((app) => (
                <tr key={app.id} className="contents">
                  <tr
                    onClick={() =>
                      setExpandedId(expandedId === app.id ? null : app.id)
                    }
                    className="border-b cursor-pointer hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">{app.jobs.company_name}</td>
                    <td className="px-4 py-3">{app.jobs.job_title}</td>
                    <td className="px-4 py-3">
                      <select
                        value={app.status}
                        onChange={(e) => {
                          e.stopPropagation();
                          updateStatus(app.id, e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm border rounded px-2 py-1"
                      >
                        {statusOptions.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm hidden md:table-cell">
                      {app.date_applied ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">
                      {new Date(app.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                  {expandedId === app.id && (
                    <tr className="border-b bg-gray-50">
                      <td colSpan={5} className="px-4 py-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium mb-1">
                              Date Applied
                            </label>
                            <input
                              type="date"
                              defaultValue={app.date_applied ?? ""}
                              onChange={(e) =>
                                updateField(app.id, "date_applied", e.target.value || null)
                              }
                              className="text-sm border rounded px-2 py-1"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1">
                              Interview Date
                            </label>
                            <input
                              type="date"
                              defaultValue={app.interview_date ?? ""}
                              onChange={(e) =>
                                updateField(app.id, "interview_date", e.target.value || null)
                              }
                              className="text-sm border rounded px-2 py-1"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs font-medium mb-1">
                              Notes
                            </label>
                            <textarea
                              defaultValue={app.notes ?? ""}
                              onBlur={(e) =>
                                updateField(app.id, "notes", e.target.value || null)
                              }
                              rows={3}
                              className="w-full text-sm border rounded px-2 py-1"
                            />
                          </div>
                          {app.generation_id && (
                            <div>
                              <Link
                                href={`/dashboard/generations/${app.generation_id}`}
                                className="text-sm text-blue-600 hover:underline"
                              >
                                View / Download Documents
                              </Link>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      )}
    </div>
  );
}
