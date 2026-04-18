import { z } from "zod";

export type RoadmapStatus = "backlog" | "planned" | "in_progress" | "complete";

export const ROADMAP_STATUSES: RoadmapStatus[] = ["backlog", "planned", "in_progress", "complete"];

export const STATUS_LABELS: Record<RoadmapStatus, string> = {
  in_progress: "In Progress",
  planned: "Planned",
  backlog: "Backlog",
  complete: "Complete",
};

// Section render order (top to bottom on /roadmap)
export const SECTION_ORDER: RoadmapStatus[] = ["in_progress", "planned", "backlog", "complete"];

export type RoadmapItem = {
  id: string;
  title: string;
  description: string | null;
  status: RoadmapStatus;
  vote_count: number;
  shipped_at: string | null;
  created_at: string;
  updated_at: string;
};

export const shippedBadge = (item: RoadmapItem): string => {
  const votes = item.vote_count === 1 ? "1 vote" : `${item.vote_count} votes`;
  return `✓ Shipped · ${votes}`;
};

// Request bodies
export const VoteBodySchema = z.object({
  itemId: z.string().uuid(),
});

export const SubmitBodySchema = z.object({
  description: z.string().trim().min(10).max(2000),
});

export const AdminCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(10_000).nullable().optional(),
  status: z.enum(["backlog", "planned", "in_progress", "complete"]).default("backlog"),
});

export const AdminPatchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().min(1).max(10_000).nullable().optional(),
  status: z.enum(["backlog", "planned", "in_progress", "complete"]).optional(),
});
