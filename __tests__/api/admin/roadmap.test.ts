/**
 * @jest-environment node
 */
import { POST } from "@/app/api/admin/roadmap/route";
import { PATCH, DELETE } from "@/app/api/admin/roadmap/[id]/route";

jest.mock("@/lib/supabase/server");
jest.mock("@/lib/supabase/admin");
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function serverMock({ user, isAdmin }: { user: { id: string } | null; isAdmin?: boolean }) {
  return {
    auth: { getUser: async () => ({ data: { user } }) },
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: user ? { is_admin: isAdmin ?? false } : null }),
            }),
          }),
        };
      }
      throw new Error(`unexpected ${table}`);
    },
  };
}

function adminMock({
  insertError = null,
  currentStatus,
  updateError = null,
  deleteError = null,
  returned = { id: "i1", status: "backlog" },
}: {
  insertError?: unknown;
  currentStatus?: string;
  updateError?: unknown;
  deleteError?: unknown;
  returned?: unknown;
} = {}) {
  return {
    from: (_table: string) => ({
      insert: () => ({ select: () => ({ single: async () => ({ data: returned, error: insertError }) }) }),
      select: () => ({ eq: () => ({ single: async () => ({ data: currentStatus ? { status: currentStatus } : null }) }) }),
      update: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: returned, error: updateError }) }) }) }),
      delete: () => ({ eq: async () => ({ error: deleteError }) }),
    }),
  };
}

const makeReq = (body?: unknown) =>
  new Request("http://localhost/x", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body == null ? undefined : JSON.stringify(body),
  });

const ctx = { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) };

describe("admin roadmap routes", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("POST /api/admin/roadmap", () => {
    it("401 when unauthed", async () => {
      (createClient as jest.Mock).mockResolvedValue(serverMock({ user: null }));
      const res = await POST(makeReq({ title: "X" }));
      expect(res.status).toBe(401);
    });

    it("403 when not admin", async () => {
      (createClient as jest.Mock).mockResolvedValue(serverMock({ user: { id: "u1" }, isAdmin: false }));
      const res = await POST(makeReq({ title: "X" }));
      expect(res.status).toBe(403);
    });

    it("400 on bad body", async () => {
      (createClient as jest.Mock).mockResolvedValue(serverMock({ user: { id: "u1" }, isAdmin: true }));
      (createAdminClient as jest.Mock).mockReturnValue(adminMock());
      const res = await POST(makeReq({ title: "" }));
      expect(res.status).toBe(400);
    });

    it("201 on happy path", async () => {
      (createClient as jest.Mock).mockResolvedValue(serverMock({ user: { id: "u1" }, isAdmin: true }));
      (createAdminClient as jest.Mock).mockReturnValue(adminMock({ returned: { id: "i1", title: "X" } }));
      const res = await POST(makeReq({ title: "New idea", status: "backlog" }));
      expect(res.status).toBe(201);
    });
  });

  describe("PATCH /api/admin/roadmap/[id]", () => {
    it("sets shipped_at when transitioning to complete", async () => {
      (createClient as jest.Mock).mockResolvedValue(serverMock({ user: { id: "u1" }, isAdmin: true }));
      const update = jest.fn().mockImplementation((u: Record<string, unknown>) => {
        expect(u.status).toBe("complete");
        expect(typeof u.shipped_at).toBe("string");
        return { eq: () => ({ select: () => ({ single: async () => ({ data: { id: "i1", status: "complete" }, error: null }) }) }) };
      });
      (createAdminClient as jest.Mock).mockReturnValue({
        from: () => ({
          select: () => ({ eq: () => ({ single: async () => ({ data: { status: "in_progress" } }) }) }),
          update,
        }),
      });
      const res = await PATCH(makeReq({ status: "complete" }), ctx);
      expect(res.status).toBe(200);
      expect(update).toHaveBeenCalledTimes(1);
    });

    it("clears shipped_at when transitioning away from complete", async () => {
      (createClient as jest.Mock).mockResolvedValue(serverMock({ user: { id: "u1" }, isAdmin: true }));
      const update = jest.fn().mockImplementation((u: Record<string, unknown>) => {
        expect(u.status).toBe("backlog");
        expect(u.shipped_at).toBeNull();
        return { eq: () => ({ select: () => ({ single: async () => ({ data: { id: "i1", status: "backlog" }, error: null }) }) }) };
      });
      (createAdminClient as jest.Mock).mockReturnValue({
        from: () => ({
          select: () => ({ eq: () => ({ single: async () => ({ data: { status: "complete" } }) }) }),
          update,
        }),
      });
      const res = await PATCH(makeReq({ status: "backlog" }), ctx);
      expect(res.status).toBe(200);
    });

    it("403 when not admin", async () => {
      (createClient as jest.Mock).mockResolvedValue(serverMock({ user: { id: "u1" }, isAdmin: false }));
      const res = await PATCH(makeReq({ title: "new" }), ctx);
      expect(res.status).toBe(403);
    });

    it("400 on empty/invalid body", async () => {
      (createClient as jest.Mock).mockResolvedValue(serverMock({ user: { id: "u1" }, isAdmin: true }));
      (createAdminClient as jest.Mock).mockReturnValue(adminMock());
      const res = await PATCH(makeReq({ title: "" }), ctx);
      expect(res.status).toBe(400);
    });

    it("leaves shipped_at untouched when status is not in the patch (title-only update)", async () => {
      (createClient as jest.Mock).mockResolvedValue(serverMock({ user: { id: "u1" }, isAdmin: true }));
      const update = jest.fn().mockImplementation((u: Record<string, unknown>) => {
        expect(u.title).toBe("Renamed");
        // Crucially, shipped_at must NOT be in the update payload at all.
        expect("shipped_at" in u).toBe(false);
        return {
          eq: () => ({
            select: () => ({
              single: async () => ({ data: { id: "i1", title: "Renamed" }, error: null }),
            }),
          }),
        };
      });
      const selectCurrent = jest.fn(); // must NOT be called when status isn't in the patch
      (createAdminClient as jest.Mock).mockReturnValue({
        from: () => ({
          select: () => {
            selectCurrent();
            return { eq: () => ({ single: async () => ({ data: { status: "complete" } }) }) };
          },
          update,
        }),
      });
      const res = await PATCH(makeReq({ title: "Renamed" }), ctx);
      expect(res.status).toBe(200);
      expect(update).toHaveBeenCalledTimes(1);
      // The current-status fetch is skipped when no status is supplied.
      expect(selectCurrent).not.toHaveBeenCalled();
    });
  });

  describe("DELETE /api/admin/roadmap/[id]", () => {
    it("200 on happy path", async () => {
      (createClient as jest.Mock).mockResolvedValue(serverMock({ user: { id: "u1" }, isAdmin: true }));
      (createAdminClient as jest.Mock).mockReturnValue(adminMock());
      const res = await DELETE(makeReq(), ctx);
      expect(res.status).toBe(200);
    });

    it("403 when not admin", async () => {
      (createClient as jest.Mock).mockResolvedValue(serverMock({ user: { id: "u1" }, isAdmin: false }));
      const res = await DELETE(makeReq(), ctx);
      expect(res.status).toBe(403);
    });
  });
});
