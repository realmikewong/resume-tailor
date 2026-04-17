import { RoadmapCard } from "./roadmap-card";
import { renderRoadmapMarkdown } from "@/lib/roadmap/markdown";
import type { RoadmapItem, RoadmapStatus } from "@/lib/roadmap/types";
import { STATUS_LABELS } from "@/lib/roadmap/types";

export function RoadmapSection({
  status,
  items,
  userVoteIds,
  userIsAuthed,
}: {
  status: RoadmapStatus;
  items: RoadmapItem[];
  userVoteIds: string[];
  userIsAuthed: boolean;
}) {
  const votedSet = new Set(userVoteIds);
  if (items.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="font-sans text-xl font-bold text-gray-900 mb-4">{STATUS_LABELS[status]}</h2>
      <div className="space-y-3">
        {items.map((item) => (
          <RoadmapCard
            key={item.id}
            item={item}
            descriptionHtml={renderRoadmapMarkdown(item.description)}
            variant={status === "complete" ? "shipped" : userIsAuthed ? "authed" : "anon"}
            initiallyVoted={votedSet.has(item.id)}
          />
        ))}
      </div>
    </section>
  );
}
