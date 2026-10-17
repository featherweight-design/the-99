// The pure half of the sender's writes; the writes themselves are proved against a database by `probe:invites`.
import { describe, expect, it, vi } from "vitest";
vi.mock("../../db", () => ({ db: {} }));
import { qrWatch } from "./send";
import { isQrToken, joinPath } from "./rules";
import { qrToken } from "./tokens";

const now = new Date("2026-10-16T12:00:00Z");
const at = (ms: number) => new Date(now.getTime() + ms);

describe("qrWatch", () => {
  it("reads a live QR with its seconds left, rounded up", () => {
    expect(qrWatch("qr_open", at(600_000), now)).toEqual({ state: "live", secondsLeft: 600 });
    expect(qrWatch("qr_open", at(1), now)).toEqual({ state: "live", secondsLeft: 1 });
  });

  it("reads a claim or a spend as claimed", () => {
    expect(qrWatch("claimed", at(-1), now)).toEqual({ state: "claimed" });
    expect(qrWatch("spent", null, now)).toEqual({ state: "claimed" });
  });

  it("reads a lapsed QR, a return and a revoke as expired", () => {
    expect(qrWatch("qr_open", now, now)).toEqual({ state: "expired" });
    expect(qrWatch("qr_open", null, now)).toEqual({ state: "expired" });
    expect(qrWatch("returned", null, now)).toEqual({ state: "expired" });
    expect(qrWatch("revoked", null, now)).toEqual({ state: "expired" });
  });
});

describe("isQrToken and joinPath", () => {
  it("accepts exactly a derived token's shape", () => {
    const t = qrToken("ab".repeat(32), "11111111-1111-4111-8111-111111111111");
    expect(isQrToken(t)).toBe(true);
    for (const bad of [t.slice(1), `${t}a`, `${t.slice(1)}=`, `${t.slice(1)}/`, 42, null, undefined]) {
      expect(isQrToken(bad)).toBe(false);
    }
    expect(joinPath(t)).toBe(`/join/${t}`);
  });
});
