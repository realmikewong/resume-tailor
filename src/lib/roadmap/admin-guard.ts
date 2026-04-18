import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminCheck =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403; error: string };

/** Checks that the current request is from an authed admin user. */
export async function requireAdmin(supabase: SupabaseClient): Promise<AdminCheck> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("user_id", user.id)
    .single();

  if (!profile?.is_admin) return { ok: false, status: 403, error: "Forbidden" };
  return { ok: true, userId: user.id };
}
