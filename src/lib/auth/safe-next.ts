/**
 * Validate that a `?next=<value>` param is a safe internal path.
 * Decodes percent-encoding first so double-encoded open-redirect tricks
 * (`/%2F%2Fevil.com`) are caught. Rejects absolute URLs, protocol-relative
 * URLs, and backslash tricks. Used by the login form, auth callback, and
 * middleware to prevent open redirects.
 *
 * Returns the decoded, validated path — or `null` if the value is unsafe.
 */
export function safeNextPath(value: string | null | undefined): string | null {
  if (!value) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return null; // malformed percent-encoding
  }
  if (!decoded.startsWith("/")) return null;
  if (decoded.startsWith("//") || decoded.startsWith("/\\")) return null;
  return decoded;
}
