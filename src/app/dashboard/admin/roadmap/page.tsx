import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminTable } from "@/components/roadmap/admin-table";
import type { RoadmapItem } from "@/lib/roadmap/types";

export const dynamic = "force-dynamic";

export default async function AdminRoadmapPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/dashboard/admin/roadmap");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("user_id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/dashboard");

  const { data: itemsData } = await supabase
    .from("roadmap_items")
    .select("*")
    .order("created_at", { ascending: false });

  const items = (itemsData ?? []) as RoadmapItem[];

  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="font-sans text-3xl font-bold text-gray-900">Roadmap admin</h1>
      <p className="mt-1 text-gray-600">Add, edit, and change the status of roadmap items.</p>
      <AdminTable initialItems={items} />
    </main>
  );
}
