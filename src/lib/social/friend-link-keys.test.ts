import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: {} }));

import { isInviteToken } from "./client-rules";
import { FRIEND_CODE_ALPHABET, normalizeFriendCode } from "./friend-code";
import { codeOwnerIn, deriveFriendCode, deriveLinkToken, friendCodeHmac, linkOwnerIn, linkTokenHash } from "./friend-link-keys";

const SECRET = "a".repeat(64);
const OTHER = "b".repeat(64);
const ID = "4f2b8a3e-7c1d-4e9a-9b6f-0123456789ab";

describe("friend link key derivation", () => {
  it("derives a 128-bit link token in the invite token's shape, the same every time", () => {
    const token = deriveLinkToken(SECRET, ID);
    expect(isInviteToken(token)).toBe(true);
    expect(Buffer.from(token, "base64url")).toHaveLength(16);
    expect(deriveLinkToken(SECRET, ID)).toBe(token);
  });

  it("derives a code the code box accepts, the same every time", () => {
    const code = deriveFriendCode(SECRET, ID);
    expect(normalizeFriendCode(code)).toBe(code);
    expect(deriveFriendCode(SECRET, ID)).toBe(code);
  });

  it("changes both with the key or the row, so a rotated key or a Reset ends the old pair", () => {
    expect(deriveLinkToken(OTHER, ID)).not.toBe(deriveLinkToken(SECRET, ID));
    expect(deriveFriendCode(OTHER, ID)).not.toBe(deriveFriendCode(SECRET, ID));
    const next = "4f2b8a3e-7c1d-4e9a-9b6f-0123456789ac";
    expect(deriveLinkToken(SECRET, next)).not.toBe(deriveLinkToken(SECRET, ID));
    expect(deriveFriendCode(SECRET, next)).not.toBe(deriveFriendCode(SECRET, ID));
  });

  it("draws every symbol of the alphabet over many rows (no symbol is unreachable)", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) for (const c of deriveFriendCode(SECRET, `row-${i}`)) seen.add(c);
    expect([...seen].sort().join("")).toBe([...FRIEND_CODE_ALPHABET].sort().join(""));
  });

  it("stores neither secret, each keyed, so rotating the key ends both", () => {
    const token = deriveLinkToken(SECRET, ID);
    const code = deriveFriendCode(SECRET, ID);
    expect(linkTokenHash(SECRET, token)).toMatch(/^[0-9a-f]{64}$/);
    expect(linkTokenHash(SECRET, token)).not.toBe(linkTokenHash(OTHER, token));
    expect(friendCodeHmac(SECRET, code)).toMatch(/^[0-9a-f]{64}$/);
    expect(friendCodeHmac(SECRET, code)).not.toBe(friendCodeHmac(OTHER, code));
  });
});

describe("lookups that cannot be a key", () => {
  const untouched = { select: () => { throw new Error("queried"); } } as never;

  it("reads a malformed token as no link without a query", async () => {
    for (const bad of ["short", "x".repeat(23), null, 42]) expect(await linkOwnerIn(untouched, bad, SECRET)).toBeNull();
    expect(await linkOwnerIn(untouched, deriveLinkToken(SECRET, ID), null)).toBeNull();
  });

  it("reads a malformed code, or a missing key, as no code without a query", async () => {
    for (const bad of ["K7Q4X", "K7Q4X0", "", null]) expect(await codeOwnerIn(untouched, bad, SECRET)).toBeNull();
    expect(await codeOwnerIn(untouched, "K7Q4XM", null)).toBeNull();
  });
});
