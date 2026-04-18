import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { RoadmapSection } from "@/components/roadmap/roadmap-section";
import { RequestForm } from "@/components/roadmap/request-form";
import type { RoadmapItem, RoadmapStatus } from "@/lib/roadmap/types";
import { SECTION_ORDER } from "@/lib/roadmap/types";

export const metadata: Metadata = {
  title: "Roadmap | Taylor Resumé",
  description: "See what we're building next and vote on what matters to you.",
};

export const dynamic = "force-dynamic"; // Need fresh counts + per-user vote state.

export default async function RoadmapPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: itemsData, error: itemsError } = await supabase
    .from("roadmap_items")
    .select("*")
    .order("vote_count", { ascending: false })
    .order("created_at", { ascending: true });

  if (itemsError) throw itemsError;

  const items = (itemsData ?? []) as RoadmapItem[];

  let userVoteIds: string[] = [];
  if (user) {
    const { data: votes, error: votesError } = await supabase
      .from("roadmap_votes")
      .select("roadmap_item_id")
      .eq("user_id", user.id);
    if (votesError) {
      console.error("[roadmap] failed to load user votes:", votesError);
    }
    userVoteIds = (votes ?? []).map((v) => v.roadmap_item_id as string);
  }

  const grouped: Record<RoadmapStatus, RoadmapItem[]> = {
    backlog: [], planned: [], in_progress: [], complete: [],
  };
  for (const item of items) grouped[item.status].push(item);

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <header>
        <h1 className="font-sans text-3xl font-bold text-gray-900">Roadmap</h1>
        <p className="mt-2 text-gray-600">
          What we&apos;re planning, building, and have shipped. Logged-in users can vote to help us prioritize.
        </p>
      </header>

      {SECTION_ORDER.map((status) => (
        <RoadmapSection
          key={status}
          status={status}
          items={grouped[status]}
          userVoteIds={userVoteIds}
          userIsAuthed={Boolean(user)}
        />
      ))}

      {items.length === 0 && (
        <p className="mt-10 text-center text-gray-500">Nothing here yet. Check back soon.</p>
      )}

      <section className="mt-14 border-t pt-8">
        <h2 className="font-sans text-xl font-bold text-gray-900">Don&apos;t see what you want?</h2>
        {user ? (
          <>
            <p className="mt-1 text-gray-600">Send me a note — I read every request.</p>
            <RequestForm />
          </>
        ) : (
          <p className="mt-1 text-gray-600">
            <a href="/auth/login?next=/roadmap" className="text-blue-600 underline">Log in</a> to request a feature.
          </p>
        )}
      </section>
    </main>
  );
}
