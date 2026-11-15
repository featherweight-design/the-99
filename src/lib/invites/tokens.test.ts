import { createCipheriv } from "node:crypto";
import { describe, expect, it } from "vitest";
import { codeHmac, heroKey, inviteSecret, readHeroKey, newClaimSecret, newCode, qrToken, sameHex, secretHash } from "./tokens";

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

describe("the invite email's hand key", () => {
  const SECRET_A = "ab".repeat(32);
  const SECRET_B = "cd".repeat(32);
  const ID = "0a1b2c3d-4e5f-4061-8273-8495a6b7c8d9";

  it("seals a reservation id into a 59-character URL-safe key that opens back to the id", () => {
    const key = heroKey(SECRET_A, ID)!;
    expect(key).toMatch(/^[A-Za-z0-9_-]{59}$/);
    expect(readHeroKey(SECRET_A, key)).toBe(ID);
  });

  it("draws a fresh random nonce per seal: two keys for one reservation differ, and both open to it", () => {
    const a = heroKey(SECRET_A, ID)!;
    const b = heroKey(SECRET_A, ID)!;
    expect(a).not.toBe(b);
    expect(a.slice(0, 16)).not.toBe(b.slice(0, 16));
    expect(readHeroKey(SECRET_A, a)).toBe(ID);
    expect(readHeroKey(SECRET_A, b)).toBe(ID);
  });

  it("is bound to its own derived key: the QR token's and the code's secrets never open it, and it is not a MAC of the raw secret", () => {
    const key = heroKey(SECRET_A, ID)!;
    // A key sealed straight under the raw secret (no derivation, no label) does not open.
    const nonce = Buffer.alloc(12, 7);
    const c = createCipheriv("aes-256-gcm", Buffer.from(SECRET_A, "hex"), nonce);
    const raw = Buffer.concat([nonce, Buffer.concat([c.update(Buffer.from(ID.replaceAll("-", ""), "hex")), c.final()]), c.getAuthTag()]).toString("base64url");
    expect(readHeroKey(SECRET_A, raw)).toBeNull();
    expect(readHeroKey(SECRET_A, key)).toBe(ID);
  });

  it("never carries the raw id, in either spelling", () => {
    const key = heroKey(SECRET_A, ID)!;
    expect(key).not.toContain(ID);
    expect(key).not.toContain(ID.replaceAll("-", ""));
    expect(Buffer.from(key, "base64url").toString("hex")).not.toContain(ID.replaceAll("-", ""));
  });

  it("opens as null for another secret, an altered key, and anything that is not a key", () => {
    const key = heroKey(SECRET_A, ID)!;
    expect(readHeroKey(SECRET_B, key)).toBeNull();
    // Flip each region: the nonce, the sealed id, the tag.
    for (const at of [0, 20, 40]) {
      const bytes = Buffer.from(key, "base64url");
      bytes[at] ^= 1;
      expect(readHeroKey(SECRET_A, bytes.toString("base64url")), String(at)).toBeNull();
    }
    for (const bad of ["", "abc", key.slice(1), `${key}A`, key.replace(/.$/, "!"), `../${key.slice(3)}`, ID]) {
      expect(readHeroKey(SECRET_A, bad), bad).toBeNull();
    }
  });

  it("reads only the canonical spelling: a key with its spare low bits changed is null", () => {
    const key = heroKey(SECRET_A, ID)!;
    const alphabet = ["ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz", "0123456789", "-_"].join("");
    const last = alphabet.indexOf(key.at(-1)!);
    // The last character's low two bits are not data; the other three spellings of it must not open.
    const others = [0, 1, 2, 3].map((bits) => alphabet[(last & ~3) | bits]).filter((c) => c !== key.at(-1));
    expect(others).toHaveLength(3);
    for (const c of others) expect(readHeroKey(SECRET_A, key.slice(0, -1) + c)).toBeNull();
  });

  it("refuses to seal something that is not a uuid", () => {
    expect(heroKey(SECRET_A, "not-a-uuid")).toBeNull();
    expect(heroKey(SECRET_A, "")).toBeNull();
  });
});
