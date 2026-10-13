import { describe, expect, it } from "vitest";
import nextConfig from "../../../next.config";

describe("next.config headers", () => {
  it("installs the security headers on every path", async () => {
    const rules = await nextConfig.headers!();
    expect(rules).toHaveLength(1);
    expect(rules[0].source).toBe("/:path*");
    const keys = rules[0].headers.map((h) => h.key);
    for (const k of ["Strict-Transport-Security", "X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy", "Permissions-Policy"]) {
      expect(keys).toContain(k);
    }
  });
  it("sends no enforcing Content-Security-Policy", async () => {
    const rules = await nextConfig.headers!();
    expect(rules[0].headers.map((h) => h.key)).not.toContain("Content-Security-Policy");
  });
});
