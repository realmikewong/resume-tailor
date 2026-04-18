import { safeNextPath } from "@/lib/auth/safe-next";

describe("safeNextPath", () => {
  it("returns null for falsy input", () => {
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
    expect(safeNextPath("")).toBeNull();
  });

  it("accepts a simple internal path", () => {
    expect(safeNextPath("/roadmap")).toBe("/roadmap");
    expect(safeNextPath("/dashboard/generations")).toBe("/dashboard/generations");
    expect(safeNextPath("/roadmap?tab=voted")).toBe("/roadmap?tab=voted");
  });

  it("rejects absolute URLs", () => {
    expect(safeNextPath("http://evil.com")).toBeNull();
    expect(safeNextPath("https://evil.com")).toBeNull();
    expect(safeNextPath("javascript:alert(1)")).toBeNull();
  });

  it("rejects protocol-relative URLs", () => {
    expect(safeNextPath("//evil.com")).toBeNull();
    expect(safeNextPath("//evil.com/path")).toBeNull();
  });

  it("rejects backslash tricks", () => {
    expect(safeNextPath("/\\evil.com")).toBeNull();
  });

  it("rejects schemeless/non-root paths", () => {
    expect(safeNextPath("roadmap")).toBeNull();
    expect(safeNextPath("dashboard/x")).toBeNull();
  });

  it("catches double-encoded protocol-relative URLs", () => {
    // /%2F%2Fevil.com -> //evil.com after decoding
    expect(safeNextPath("/%2F%2Fevil.com")).toBeNull();
    // %2F%2Fevil.com -> //evil.com after decoding
    expect(safeNextPath("%2F%2Fevil.com")).toBeNull();
  });

  it("returns null for malformed percent-encoding", () => {
    expect(safeNextPath("%ZZ")).toBeNull();
  });
});
