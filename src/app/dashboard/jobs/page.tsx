import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { JobTrackerTable } from "@/components/jobs/job-tracker-table";
import { AddManualJobButton } from "@/components/jobs/add-manual-job-button";
import Link from "next/link";

export default async function JobsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: applications } = await supabase
    .from("applications")
    .select("*, jobs(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-6">
        <h1 className="text-2xl font-bold">Job Tracker</h1>
        <div className="flex gap-2">
          <AddManualJobButton />
          <Link
            href="/dashboard/jobs/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            + New Job (Generate)
          </Link>
        </div>
      </div>
      <JobTrackerTable applications={applications ?? []} />
    </div>
  );
}
