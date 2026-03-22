import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const { count: activeApps } = await supabase
    .from("applications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .in("status", ["applied", "interviewing"]);

  const { count: interviews } = await supabase
    .from("applications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "interviewing");

  const { data: recentGenerations } = await supabase
    .from("generations")
    .select("*, jobs(company_name, job_title)")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <p className="text-sm text-gray-500">Credits Remaining</p>
          <p className="text-3xl font-bold">{profile?.credits_remaining ?? 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <p className="text-sm text-gray-500">Active Applications</p>
          <p className="text-3xl font-bold">{activeApps ?? 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <p className="text-sm text-gray-500">Interviewing</p>
          <p className="text-3xl font-bold">{interviews ?? 0}</p>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium">Recent Generations</h2>
        <Link
          href="/dashboard/jobs/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
        >
          + New Job
        </Link>
      </div>

      {recentGenerations && recentGenerations.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm">
          {recentGenerations.map((gen: Record<string, unknown> & { id: string; created_at: string; jobs: { job_title: string; company_name: string } }) => (
            <Link
              key={gen.id}
              href={`/dashboard/generations/${gen.id}`}
              className="flex items-center justify-between p-4 border-b last:border-b-0 hover:bg-gray-50"
            >
              <div>
                <p className="font-medium">{gen.jobs.job_title}</p>
                <p className="text-sm text-gray-500">{gen.jobs.company_name}</p>
              </div>
              <span className="text-sm text-gray-400">
                {new Date(gen.created_at).toLocaleDateString()}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
          <p>No generations yet.</p>
          <Link href="/dashboard/jobs/new" className="text-blue-600 hover:underline text-sm">
            Create your first tailored resume
          </Link>
        </div>
      )}
    </div>
  );
}
