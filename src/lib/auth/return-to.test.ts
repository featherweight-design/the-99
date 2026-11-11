// @vitest-environment node
import { describe, expect, it } from "vitest";
import { HOME, hashReturn, returnTo, signInReturn, withReturn } from "./return-to";

const HOST = "the99.test";

describe("returnTo", () => {
  it("keeps a same-site path, with its query and fragment, as written", () => {
    expect(returnTo("/decks", HOST)).toBe("/decks");
    expect(returnTo("/decks/abc?tab=cards&x=1#top", HOST)).toBe("/decks/abc?tab=cards&x=1#top");
    expect(returnTo("/card/sol%20ring", HOST)).toBe("/card/sol%20ring");
  });

  it("keeps only the path of an absolute URL on the request's own host", () => {
    expect(returnTo("https://the99.test/friend/abc?x=1#y", HOST)).toBe("/friend/abc?x=1#y");
    expect(returnTo("http://THE99.test/decks", HOST)).toBe("/decks");
    expect(returnTo("https://the99.test", HOST)).toBe("/");
  });

  it.each([
    ["a protocol-relative path", "//evil.com"],
    ["a protocol-relative path with a path", "//evil.com/decks"],
    ["a backslash a browser reads as a slash", "/\\evil.com"],
    ["a backslash anywhere", "/a\\b"],
    ["an encoded backslash", "/%5Cevil.com"],
    ["an encoded backslash, lower case", "/%5cevil.com"],
    ["slashes that decode to protocol-relative", "/%2F%2Fevil.com"],
    ["one slash that decodes to protocol-relative", "/%2Fevil.com"],
    ["encoded slashes with no leading slash", "%2F%2Fevil.com"],
    ["another host", "https://evil.com/x"],
    ["another host that starts like ours", "https://the99.test.evil.com/x"],
    ["our host with credentials in front", "https://user:pw@the99.test/x"],
    ["our host, then a protocol-relative path", "https://the99.test//evil.com"],
    ["a script URL", "javascript:alert(1)"],
    ["a data URL", "data:text/html,<script>alert(1)</script>"],
    ["a bare word", "decks"],
    ["a tab a parser strips", "/\t/evil.com"],
    ["a newline", "/decks\n"],
    ["an undecodable escape", "/100%"],
    ["empty", ""],
  ])("refuses %s", (_, raw) => {
    expect(returnTo(raw, HOST)).toBe(HOME);
  });

  it("refuses a repeated parameter, a missing one, and an absolute URL with no host to compare against", () => {
    expect(returnTo(["/decks", "/collection"], HOST)).toBe(HOME);
    expect(returnTo(undefined, HOST)).toBe(HOME);
    expect(returnTo(null, HOST)).toBe(HOME);
    expect(returnTo("https://the99.test/decks", null)).toBe(HOME);
    // A path needs no host.
    expect(returnTo("/decks", null)).toBe("/decks");
  });
});

describe("signInReturn", () => {
  it("reads a forced destination before the page the reader came from, as Clerk does", () => {
    expect(signInReturn({ redirect_url: "https://the99.test/decks" }, HOST)).toBe("/decks");
    expect(signInReturn({ sign_in_force_redirect_url: "/friends/accept/x", redirect_url: "/decks" }, HOST)).toBe("/friends/accept/x");
    expect(signInReturn({}, HOST)).toBe(HOME);
    expect(signInReturn({ redirect_url: "https://evil.com/" }, HOST)).toBe(HOME);
  });

  it("falls through an unsafe forced destination to the page the reader came from", () => {
    expect(signInReturn({ sign_in_force_redirect_url: "https://evil.com/x", redirect_url: "/decks" }, HOST)).toBe("/decks");
    expect(signInReturn({ sign_in_force_redirect_url: ["/a", "/b"], redirect_url: "/decks" }, HOST)).toBe("/decks");
    expect(signInReturn({ sign_in_force_redirect_url: "//evil.com", redirect_url: "//evil.com" }, HOST)).toBe(HOME);
  });
});

describe("withReturn", () => {
  it("adds the destination as redirect_url, and nothing for Home", () => {
    expect(withReturn("/sso-callback", "/decks?x=1")).toBe("/sso-callback?redirect_url=%2Fdecks%3Fx%3D1");
    expect(withReturn("/sign-in?google=refused", "/decks")).toBe("/sign-in?google=refused&redirect_url=%2Fdecks");
    expect(withReturn("/sso-callback", HOME)).toBe("/sso-callback");
  });
});

describe("hashReturn", () => {
  it("reads what a <SignInButton> wrote after the hash, made safe, and nothing from a hash without it", () => {
    expect(hashReturn(`#/?redirect_url=${encodeURIComponent("https://the99.test/decks?x=1")}`, HOST)).toBe("/decks?x=1");
    expect(hashReturn(`#/?redirect_url=a&sign_in_force_redirect_url=${encodeURIComponent("https://the99.test/friend/t")}`, HOST)).toBe("/friend/t");
    expect(hashReturn(`#/?redirect_url=${encodeURIComponent("https://evil.com/")}`, HOST)).toBe(HOME);
    expect(hashReturn("#/?redirect_url=%2Fa&redirect_url=%2Fb", HOST)).toBe(HOME);
    expect(hashReturn("", HOST)).toBeNull();
    expect(hashReturn("#top", HOST)).toBeNull();
    expect(hashReturn("#/?other=1", HOST)).toBeNull();
  });
});
