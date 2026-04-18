import { shippedBadge, VoteBodySchema, SubmitBodySchema, AdminCreateSchema, AdminPatchSchema } from "@/lib/roadmap/types";

describe("shippedBadge", () => {
  it("singularizes one vote", () => {
    expect(shippedBadge({ vote_count: 1 } as never)).toBe("✓ Shipped · 1 vote");
  });
  it("pluralizes for zero or many", () => {
    expect(shippedBadge({ vote_count: 0 } as never)).toBe("✓ Shipped · 0 votes");
    expect(shippedBadge({ vote_count: 42 } as never)).toBe("✓ Shipped · 42 votes");
  });
});

describe("schemas", () => {
  it("VoteBodySchema rejects non-UUIDs", () => {
    expect(VoteBodySchema.safeParse({ itemId: "nope" }).success).toBe(false);
  });
  it("SubmitBodySchema trims and enforces length", () => {
    expect(SubmitBodySchema.safeParse({ description: "short" }).success).toBe(false);
    const padded = SubmitBodySchema.safeParse({ description: "  " + "a".repeat(20) + "  " });
    expect(padded.success).toBe(true);
    // Trim is actually applied to the parsed output, not just the length check:
    if (padded.success) expect(padded.data.description).toBe("a".repeat(20));
    expect(SubmitBodySchema.safeParse({ description: "a".repeat(2001) }).success).toBe(false);
  });
  it("AdminPatchSchema allows empty object", () => {
    expect(AdminPatchSchema.safeParse({}).success).toBe(true);
  });

  it("AdminCreateSchema defaults status to backlog", () => {
    const result = AdminCreateSchema.safeParse({ title: "Test" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBe("backlog");
  });

  it("AdminCreateSchema rejects empty description strings", () => {
    expect(AdminCreateSchema.safeParse({ title: "Test", description: "" }).success).toBe(false);
    expect(AdminCreateSchema.safeParse({ title: "Test", description: null }).success).toBe(true);
    expect(AdminCreateSchema.safeParse({ title: "Test" }).success).toBe(true);
  });
});
