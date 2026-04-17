/**
 * @jest-environment node
 */
import { POST } from "@/app/api/roadmap/submit/route";

jest.mock("@/lib/supabase/server");
jest.mock("@/lib/resend");

import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/resend";

function makeReq(body: unknown) {
  return new Request("http://localhost/api/roadmap/submit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/roadmap/submit", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ADMIN_NOTIFICATION_EMAIL = "admin@example.com";
    (sendEmail as jest.Mock).mockResolvedValue({ id: "msg-1", error: null });
  });

  it("401 when unauthed", async () => {
    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    });
    const res = await POST(makeReq({ description: "a".repeat(20) }));
    expect(res.status).toBe(401);
  });

  it("400 when description too short", async () => {
    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "u1", email: "u@x.com" } } }) },
    });
    const res = await POST(makeReq({ description: "hi" }));
    expect(res.status).toBe(400);
  });

  it("400 when description too long", async () => {
    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "u1", email: "u@x.com" } } }) },
    });
    const res = await POST(makeReq({ description: "a".repeat(2001) }));
    expect(res.status).toBe(400);
  });

  it("sends email with user context on happy path", async () => {
    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "u1", email: "u@x.com" } } }) },
    });
    const res = await POST(makeReq({ description: "a".repeat(20) }));
    expect(res.status).toBe(200);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const call = (sendEmail as jest.Mock).mock.calls[0][0];
    expect(call.to).toBe("admin@example.com");
    expect(call.subject).toContain("u@x.com");
  });

  it("500 when Resend errors", async () => {
    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "u1", email: "u@x.com" } } }) },
    });
    (sendEmail as jest.Mock).mockResolvedValue({ id: null, error: "boom" });
    const res = await POST(makeReq({ description: "a".repeat(20) }));
    expect(res.status).toBe(500);
  });

  it("500 when ADMIN_NOTIFICATION_EMAIL is missing", async () => {
    delete process.env.ADMIN_NOTIFICATION_EMAIL;
    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "u1", email: "u@x.com" } } }) },
    });
    const res = await POST(makeReq({ description: "a".repeat(20) }));
    expect(res.status).toBe(500);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
