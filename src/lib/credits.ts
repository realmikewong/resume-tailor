import { SupabaseClient } from "@supabase/supabase-js";

export async function deductCredit(
  supabase: SupabaseClient,
  userId: string
): Promise<{ success: boolean; remaining: number }> {
  const { data, error } = await supabase.rpc("deduct_credit", {
    p_user_id: userId,
  });

  if (error) {
    return { success: false, remaining: 0 };
  }

  return { success: true, remaining: data };
}

export async function refundCredit(
  supabase: SupabaseClient,
  userId: string,
  reason: string = "refund_failed_generation"
): Promise<void> {
  await supabase.rpc("refund_credit", {
    p_user_id: userId,
    p_reason: reason,
  });
}
