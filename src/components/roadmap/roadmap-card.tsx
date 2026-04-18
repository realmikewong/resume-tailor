"use client";

import { useState } from "react";
import type { RoadmapItem } from "@/lib/roadmap/types";
import { shippedBadge } from "@/lib/roadmap/types";

type Props = {
  item: RoadmapItem;
  descriptionHtml: string;
  variant: "authed" | "anon" | "shipped";
  initiallyVoted: boolean;
};

export function RoadmapCard({ item, descriptionHtml, variant, initiallyVoted }: Props) {
  const [voted, setVoted] = useState(initiallyVoted);
  const [count, setCount] = useState(item.vote_count);
  const [busy, setBusy] = useState(false);

  async function toggleVote() {
    if (busy || variant !== "authed") return;
    const prevVoted = voted;
    const prevCount = count;
    setVoted(!prevVoted);
    setCount(prevCount + (prevVoted ? -1 : 1));
    setBusy(true);
    try {
      const res = await fetch("/api/roadmap/vote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ itemId: item.id }),
      });
      if (!res.ok) throw new Error("vote failed");
      const data = (await res.json()) as { voted: boolean; vote_count: number };
      setVoted(data.voted);
      setCount(data.vote_count);
    } catch {
      setVoted(prevVoted);
      setCount(prevCount);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="border border-gray-200 rounded-lg p-5 bg-white flex gap-4">
      <div className="flex-1 min-w-0">
        <h3 className="font-sans font-semibold text-lg text-gray-900">{item.title}</h3>
        {descriptionHtml && (
          <div
            className="prose prose-sm mt-2 max-w-none text-gray-600"
            dangerouslySetInnerHTML={{ __html: descriptionHtml }}
          />
        )}
      </div>
      <div className="shrink-0">
        {variant === "shipped" ? (
          <span className="inline-flex items-center px-3 py-2 rounded-md bg-green-50 text-green-800 text-sm font-medium">
            {shippedBadge(item)}
          </span>
        ) : variant === "anon" ? (
          <a
            href="/auth/login?next=/roadmap"
            aria-label={`Sign in to vote for ${item.title}`}
            className="inline-flex flex-col items-center px-3 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <span aria-hidden>👍</span>
            <span className="text-sm">{count}</span>
          </a>
        ) : (
          <button
            type="button"
            onClick={toggleVote}
            disabled={busy}
            aria-pressed={voted}
            aria-label={`${voted ? "Remove vote for" : "Vote for"} ${item.title}`}
            className={`inline-flex flex-col items-center px-3 py-2 rounded-md border ${
              voted ? "bg-blue-50 border-blue-400 text-blue-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <span aria-hidden>👍</span>
            <span className="text-sm">{count}</span>
          </button>
        )}
      </div>
    </article>
  );
}
