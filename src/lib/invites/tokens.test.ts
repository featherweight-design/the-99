import { describe, expect, it } from "vitest";
import { codeHmac, inviteSecret, newClaimSecret, newCode, qrToken, sameHex, secretHash } from "./tokens";

const KEY = "a".repeat(64);
const ID = "6f1c2c1e-6a51-4f43-8f43-2a0b3c9b8e11";

describe("invite secrets", () => {
  it("reads the key only when it is long enough to be one", () => {
    expect(inviteSecret({ INVITE_CODE_SECRET: KEY })).toBe(KEY);
    expect(inviteSecret({ INVITE_CODE_SECRET: "short" })).toBeNull();
    expect(inviteSecret({ INVITE_CODE_SECRET: "a".repeat(32) })).toBeNull();
    expect(inviteSecret({ INVITE_CODE_SECRET: "z".repeat(64) })).toBeNull();
    expect(inviteSecret({})).toBeNull();
  });

  it("derives the same QR token for the same id and key, and a different one for another of either", () => {
    const t = qrToken(KEY, ID);
    expect(t).toBe(qrToken(KEY, ID));
    expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(qrToken(KEY, ID.replace("1", "2"))).not.toBe(t);
    expect(qrToken("b".repeat(64), ID)).not.toBe(t);
  });

  it("labels each use apart: over the SAME input, a token and a code's HMAC differ by their label alone", () => {
    // codeHmac MACs `${id}:${code}`; a token MACs its id. Give the token that very string.
    const same = `${ID}:012345`;
    expect(Buffer.from(qrToken(KEY, same), "base64url").toString("hex")).not.toBe(codeHmac(KEY, ID, "012345"));
  });

  it("binds a code to its reservation", () => {
    expect(codeHmac(KEY, ID, "012345")).toBe(codeHmac(KEY, ID, "012345"));
    expect(codeHmac(KEY, ID, "012345")).not.toBe(codeHmac(KEY, ID.replace("1", "2"), "012345"));
    expect(codeHmac(KEY, ID, "012345")).not.toBe(codeHmac(KEY, ID, "012346"));
  });

  it("compares stored values whole", () => {
    const a = codeHmac(KEY, ID, "012345");
    expect(sameHex(a, a)).toBe(true);
    expect(sameHex(a, codeHmac(KEY, ID, "012346"))).toBe(false);
    expect(sameHex(a, a.slice(0, 10))).toBe(false);
    expect(sameHex("", "")).toBe(false);
  });

  it("makes six-digit codes and fresh claim secrets", () => {
    for (let i = 0; i < 50; i++) expect(newCode()).toMatch(/^\d{6}$/);
    expect(newClaimSecret()).not.toBe(newClaimSecret());
    expect(secretHash("x")).toMatch(/^[0-9a-f]{64}$/);
  });
});
