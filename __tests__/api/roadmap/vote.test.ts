/**
 * @jest-environment node
 */
import { POST } from "@/app/api/roadmap/vote/route";

jest.mock("@/lib/supabase/server");
import { createClient } from "@/lib/supabase/server";

type MockUser = { id: string } | null;
type MockItem = { id: string; status: string; vote_count: number } | null;

function buildMock({
  user = { id: "user-1" },
  item = { id: "00000000-0000-4000-8000-000000000001", status: "backlog", vote_count: 0 },
  existingVote = false,
  refreshedCount = 1,
  insertError = null,
}: {
  user?: MockUser;
  item?: MockItem;
  existingVote?: boolean;
  refreshedCount?: number;
  insertError?: { code: string; message?: string } | null;
} = {}) {
  let itemsCall = 0;
  const from = jest.fn((table: string) => {
    if (table === "roadmap_items") {
      itemsCall += 1;
      if (itemsCall === 1) {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: item, error: item ? null : { message: "not found" } }),
            }),
          }),
        } as never;
      }
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { vote_count: refreshedCount }, error: null }),
          }),
        }),
      } as never;
    }
    if (table === "roadmap_votes") {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: existingVote ? { roadmap_item_id: item?.id } : null,
              }),
            }),
          }),
        }),
        delete: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }),
        insert: async () => ({ error: insertError }),
      } as never;
    }
    throw new Error(`unmocked table ${table}`);
  });

  return {
    auth: { getUser: async () => ({ data: { user } }) },
    from,
  };
}

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/roadmap/vote", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/roadmap/vote", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when unauthed", async () => {
    (createClient as jest.Mock).mockResolvedValue(buildMock({ user: null }));
    const res = await POST(makeRequest({ itemId: "00000000-0000-4000-8000-000000000001" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 on bad body", async () => {
    (createClient as jest.Mock).mockResolvedValue(buildMock());
    const res = await POST(makeRequest({ itemId: "not-a-uuid" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 on complete item", async () => {
    (createClient as jest.Mock).mockResolvedValue(
      buildMock({
        item: { id: "00000000-0000-4000-8000-000000000001", status: "complete", vote_count: 5 },
      })
    );
    const res = await POST(makeRequest({ itemId: "00000000-0000-4000-8000-000000000001" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Voting closed for shipped features" });
  });

  it("inserts a vote when none exists", async () => {
    (createClient as jest.Mock).mockResolvedValue(buildMock({ existingVote: false, refreshedCount: 1 }));
    const res = await POST(makeRequest({ itemId: "00000000-0000-4000-8000-000000000001" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ voted: true, vote_count: 1 });
  });

  it("deletes a vote when one exists", async () => {
    (createClient as jest.Mock).mockResolvedValue(buildMock({ existingVote: true, refreshedCount: 0 }));
    const res = await POST(makeRequest({ itemId: "00000000-0000-4000-8000-000000000001" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ voted: false, vote_count: 0 });
  });

  it("returns 404 when item does not exist", async () => {
    (createClient as jest.Mock).mockResolvedValue(buildMock({ item: null }));
    const res = await POST(makeRequest({ itemId: "00000000-0000-4000-8000-000000000001" }));
    expect(res.status).toBe(404);
  });

  it("treats 23505 unique-violation as idempotent success (double-click race)", async () => {
    (createClient as jest.Mock).mockResolvedValue(
      buildMock({
        existingVote: false,
        insertError: { code: "23505", message: "duplicate key value" },
        refreshedCount: 1,
      })
    );
    const res = await POST(makeRequest({ itemId: "00000000-0000-4000-8000-000000000001" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ voted: true, vote_count: 1 });
  });

  it("returns 500 on non-23505 insert errors", async () => {
    (createClient as jest.Mock).mockResolvedValue(
      buildMock({
        existingVote: false,
        insertError: { code: "42P01", message: "undefined_table" },
      })
    );
    const res = await POST(makeRequest({ itemId: "00000000-0000-4000-8000-000000000001" }));
    expect(res.status).toBe(500);
  });
});
