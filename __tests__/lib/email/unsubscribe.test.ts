import { generateUnsubscribeToken, verifyUnsubscribeToken } from "@/lib/email/unsubscribe";

// Set test secret
process.env.EMAIL_UNSUBSCRIBE_SECRET = "test-secret-key-for-hmac";

describe("unsubscribe tokens", () => {
  const userId = "550e8400-e29b-41d4-a716-446655440000";

  it("generates a non-empty token string", () => {
    const token = generateUnsubscribeToken(userId);
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });

  it("verifies a valid token and returns the userId", () => {
    const token = generateUnsubscribeToken(userId);
    const result = verifyUnsubscribeToken(token);
    expect(result).toBe(userId);
  });

  it("returns null for a tampered token", () => {
    const token = generateUnsubscribeToken(userId);
    const tampered = token.slice(0, -4) + "xxxx";
    const result = verifyUnsubscribeToken(tampered);
    expect(result).toBeNull();
  });

  it("returns null for a completely invalid token", () => {
    const result = verifyUnsubscribeToken("not-a-real-token");
    expect(result).toBeNull();
  });

  it("returns null for an empty string", () => {
    const result = verifyUnsubscribeToken("");
    expect(result).toBeNull();
  });
});
