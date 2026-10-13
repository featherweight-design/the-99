import { describe, expect, it } from "vitest";
import { clerkFrontendHost, contentSecurityPolicy, CSP_REPORT_PATH, securityHeaders } from "./headers";

// pk_test_ + base64("fine-owl-1.clerk.accounts.dev$")
const KEY = `pk_test_${Buffer.from("fine-owl-1.clerk.accounts.dev$").toString("base64")}`;

describe("clerkFrontendHost", () => {
  it("reads the host a publishable key names", () => {
    expect(clerkFrontendHost(KEY)).toBe("fine-owl-1.clerk.accounts.dev");
  });
  it("reads a live key and a url-safe encoding", () => {
    const live = `pk_live_${Buffer.from("clerk.the-99.dev$").toString("base64url")}`;
    expect(clerkFrontendHost(live)).toBe("clerk.the-99.dev");
  });
  it("is null for anything that is not a publishable key", () => {
    for (const v of [undefined, "", "sk_test_abc", "pk_test_", `pk_test_${Buffer.from("no-terminator").toString("base64")}`, "pk_test_%%%"]) {
      expect(clerkFrontendHost(v)).toBeNull();
    }
  });
});

describe("contentSecurityPolicy", () => {
  const csp = contentSecurityPolicy("fine-owl-1.clerk.accounts.dev");
  const directive = (name: string) => csp.split("; ").find((d) => d.startsWith(`${name} `)) ?? "";

  it("allows the card art and symbols the app draws", () => {
    expect(directive("img-src")).toContain("https://cards.scryfall.io");
    expect(directive("img-src")).toContain("https://svgs.scryfall.io");
  });
  it("allows Clerk's script and API on the key's own host, and nothing wider", () => {
    expect(directive("script-src")).toContain("https://fine-owl-1.clerk.accounts.dev");
    expect(directive("connect-src")).toContain("https://fine-owl-1.clerk.accounts.dev");
    expect(csp).not.toContain("*");
  });
  it("keeps the service worker and the manifest on this origin", () => {
    expect(directive("worker-src")).toContain("'self'");
    expect(directive("manifest-src")).toBe("manifest-src 'self'");
  });
  it("closes the plugin, base and framing doors and reports to the endpoint", () => {
    expect(directive("object-src")).toBe("object-src 'none'");
    expect(directive("base-uri")).toBe("base-uri 'self'");
    expect(directive("frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(csp.endsWith(`report-uri ${CSP_REPORT_PATH}`)).toBe(true);
  });
  it("names no Clerk host when the key does not", () => {
    expect(contentSecurityPolicy(null)).not.toContain("clerk.accounts");
  });
});

describe("securityHeaders", () => {
  const names = (h: { key: string }[]) => h.map((x) => x.key);
  it("enforces five headers everywhere and reports the policy in production only", () => {
    const dev = securityHeaders({ production: false, clerkHost: null });
    const prod = securityHeaders({ production: true, clerkHost: null });
    expect(names(dev)).toEqual(["Strict-Transport-Security", "X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy", "Permissions-Policy"]);
    expect(names(prod)).toEqual([...names(dev), "Content-Security-Policy-Report-Only"]);
  });
  it("never enforces a policy in this change: the CSP is report-only", () => {
    expect(names(securityHeaders({ production: true, clerkHost: null }))).not.toContain("Content-Security-Policy");
  });
  it("does not preload HSTS or reach subdomains", () => {
    const hsts = securityHeaders({ production: true, clerkHost: null }).find((h) => h.key === "Strict-Transport-Security")!;
    expect(hsts.value).not.toMatch(/includeSubDomains|preload/);
  });
  it("leaves the camera to this origin for the scanner and denies the rest", () => {
    const p = securityHeaders({ production: true, clerkHost: null }).find((h) => h.key === "Permissions-Policy")!.value;
    expect(p).toContain("camera=(self)");
    expect(p).toContain("microphone=()");
    expect(p).toContain("geolocation=()");
  });
});
