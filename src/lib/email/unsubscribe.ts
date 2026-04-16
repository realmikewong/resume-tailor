import { createHmac, timingSafeEqual } from "crypto";

function getSecret(): string {
  const secret = process.env.EMAIL_UNSUBSCRIBE_SECRET;
  if (!secret) throw new Error("EMAIL_UNSUBSCRIBE_SECRET is not set");
  return secret;
}

export function generateUnsubscribeToken(userId: string): string {
  const hmac = createHmac("sha256", getSecret()).update(userId).digest("hex");
  // Token format: userId.hmac (both hex-safe, no encoding needed)
  return `${userId}.${hmac}`;
}

export function verifyUnsubscribeToken(token: string): string | null {
  try {
    const dotIndex = token.indexOf(".");
    if (dotIndex === -1) return null;

    const userId = token.slice(0, dotIndex);
    const providedHmac = token.slice(dotIndex + 1);

    if (!userId || !providedHmac) return null;

    const expectedHmac = createHmac("sha256", getSecret())
      .update(userId)
      .digest("hex");

    // Constant-time comparison to prevent timing attacks
    if (providedHmac.length !== expectedHmac.length) return null;

    const a = Buffer.from(providedHmac, "hex");
    const b = Buffer.from(expectedHmac, "hex");

    if (a.length !== b.length) return null;
    if (!timingSafeEqual(a, b)) return null;

    return userId;
  } catch {
    return null;
  }
}
