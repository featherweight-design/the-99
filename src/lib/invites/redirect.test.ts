import { describe, expect, it } from "vitest";
import { invitationRedirectUrl } from "./redirect";

const h = (init: Record<string, string>) => new Headers(init);

describe("invitationRedirectUrl", () => {
  it("is the deployment's canonical /sign-up whenever it is set, whatever host the request names", () => {
    const site = new URL("https://the99.app");
    expect(invitationRedirectUrl(site, h({ host: "the99.app" }))).toBe("https://the99.app/sign-up");
    expect(invitationRedirectUrl(site, h({ host: "evil.test", "x-forwarded-host": "evil.test" }))).toBe("https://the99.app/sign-up");
    expect(invitationRedirectUrl(site, h({}))).toBe("https://the99.app/sign-up");
  });

  it("off Vercel, is a local server's own /sign-up, and nothing for any other host", () => {
    expect(invitationRedirectUrl(undefined, h({ host: "localhost:3000" }))).toBe("http://localhost:3000/sign-up");
    expect(invitationRedirectUrl(undefined, h({ host: "127.0.0.1:3001" }))).toBe("http://127.0.0.1:3001/sign-up");
    expect(invitationRedirectUrl(undefined, h({ host: "evil.test" }))).toBeNull();
    expect(invitationRedirectUrl(undefined, h({ host: "localhost.evil.test" }))).toBeNull();
    expect(invitationRedirectUrl(undefined, h({ host: "localhost:3000", "x-forwarded-proto": "https" }))).toBeNull();
    expect(invitationRedirectUrl(undefined, h({}))).toBeNull();
  });
});
