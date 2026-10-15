// The client-safe rules: the name caps count code points, as the database does (E14); the friend link's
// address comes from the request (E7); and its QR code is drawn from the link alone, with no network call (E13).
import { afterEach, describe, expect, it, vi } from "vitest";
import { encode } from "uqr";
import { capName, codePointLength, DISPLAY_NAME_MAX, invitePath, isInviteToken, originFrom, qrPath } from "./client-rules";
import { cleanDisplayName } from "./rules";

afterEach(() => vi.unstubAllGlobals());

describe("the name cap", () => {
  it("counts an emoji as one, where maxLength counts two", () => {
    expect("🐉".length).toBe(2);
    expect(codePointLength("🐉")).toBe(1);
  });

  it("keeps a 30-character name holding emoji whole, which cleanName accepts", () => {
    const name = "🐉".repeat(DISPLAY_NAME_MAX);
    expect(capName(name, DISPLAY_NAME_MAX)).toBe(name);
    expect(cleanDisplayName(name)).toBe(name);
  });

  it("cuts a longer one to what fits, never half a composed emoji", () => {
    expect(capName("🐉".repeat(31), DISPLAY_NAME_MAX)).toBe("🐉".repeat(30));
    const family = "👨‍👩‍👧"; // five code points
    expect(capName(`${"a".repeat(27)}${family}`, DISPLAY_NAME_MAX)).toBe("a".repeat(27));
  });

  it("leaves a value that fits exactly as typed", () => {
    expect(capName(" a  b ", DISPLAY_NAME_MAX)).toBe(" a  b ");
  });
});

describe("the friend link's address", () => {
  const h = (o: Record<string, string>) => ({ get: (k: string) => o[k] ?? null });

  it("takes the forwarded host and protocol", () => {
    expect(originFrom(h({ "x-forwarded-host": "the-99.dev", "x-forwarded-proto": "https", host: "internal" }))).toBe("https://the-99.dev");
  });

  it("falls back to host, over http only on localhost", () => {
    expect(originFrom(h({ host: "localhost:3000" }))).toBe("http://localhost:3000");
    expect(originFrom(h({ host: "staging.the-99.dev" }))).toBe("https://staging.the-99.dev");
  });

  it("refuses a host that is not a bare host name", () => {
    expect(originFrom(h({}))).toBeNull();
    expect(originFrom(h({ host: "evil.test/path" }))).toBeNull();
    expect(originFrom(h({ host: "a@b.test" }))).toBeNull();
  });

  it("knows a token's shape and its path", () => {
    expect(isInviteToken("AbCdEfGhIjKlMnOpQrStUv")).toBe(true);
    expect(isInviteToken("AbCdEfGhIjKlMnOpQrStU")).toBe(false);
    expect(isInviteToken("../../AbCdEfGhIjKlMnOp")).toBe(false);
    expect(invitePath("tok")).toBe("/friend/tok");
  });
});

describe("qrPath", () => {
  const url = "https://staging.the-99.dev/friend/AbCdEfGhIjKlMnOpQrStUv";

  it("draws one square per dark module, inside a grid with its quiet zone", () => {
    const { size, d } = qrPath(url);
    const { data } = encode(url, { ecc: "M", border: 2 });
    expect(size).toBe(data.length);
    expect(d.match(/M/g)?.length).toBe(data.flat().filter(Boolean).length);
    expect(d.startsWith("M")).toBe(true);
  });

  it("makes no network call", () => {
    const fetch = vi.fn(() => { throw new Error("network"); });
    vi.stubGlobal("fetch", fetch);
    vi.stubGlobal("XMLHttpRequest", vi.fn(() => { throw new Error("network"); }));
    expect(qrPath(url).d.length).toBeGreaterThan(0);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("is the same picture every time, and a different one for a different link", () => {
    expect(qrPath(url)).toEqual(qrPath(url));
    expect(qrPath(`${url}x`).d).not.toBe(qrPath(url).d);
  });
});
