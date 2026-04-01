import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("terms_accepted_at")
    .eq("user_id", user.id)
    .single();

  if (!profile || !profile.terms_accepted_at) {
    redirect("/auth/accept-terms");
  }

  return (
    <div className="flex min-h-screen font-sans">
      <Sidebar />
      <main className="flex-1 bg-gray-50 p-4 pt-18 md:p-8">{children}</main>
    </div>
  );
}
