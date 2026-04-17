import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { VoteBodySchema } from "@/lib/roadmap/types";

export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = VoteBodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const { itemId } = parsed.data;

  // Fetch the item to check status exists + not complete
  const { data: item, error: itemErr } = await supabase
    .from("roadmap_items")
    .select("id, status, vote_count")
    .eq("id", itemId)
    .single();
  if (itemErr || !item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  if (item.status === "complete") {
    return NextResponse.json({ error: "Voting closed for shipped features" }, { status: 400 });
  }

  // Does the user already have a vote?
  const { data: existing } = await supabase
    .from("roadmap_votes")
    .select("roadmap_item_id")
    .eq("roadmap_item_id", itemId)
    .eq("user_id", user.id)
    .maybeSingle();

  let voted: boolean;
  if (existing) {
    const { error } = await supabase.from("roadmap_votes").delete()
      .eq("roadmap_item_id", itemId).eq("user_id", user.id);
    if (error) return NextResponse.json({ error: "Vote toggle failed" }, { status: 500 });
    voted = false;
  } else {
    const { error } = await supabase.from("roadmap_votes").insert({
      roadmap_item_id: itemId,
      user_id: user.id,
    });
    // 23505 = unique_violation (e.g., double-click race). Treat as idempotent.
    if (error && error.code !== "23505") {
      return NextResponse.json({ error: "Vote toggle failed" }, { status: 500 });
    }
    voted = true;
  }

  // Re-read the updated count (trigger has fired)
  const { data: refreshed } = await supabase
    .from("roadmap_items")
    .select("vote_count")
    .eq("id", itemId)
    .single();

  return NextResponse.json({ voted, vote_count: refreshed?.vote_count ?? item.vote_count });
}
