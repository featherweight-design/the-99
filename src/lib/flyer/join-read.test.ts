import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  findFlyerCode: vi.fn(),
  resolveSwitchEnv: vi.fn(),
  loadInviteCount: vi.fn(),
  /** The claims table as the fake `db` filters it: the reads below are looked up by the conditions they pass. */
  claims: [] as Record<string, unknown>[],
}));
// `eq` and `and` keep their arguments so the fake `db` can apply the same lookup the real query makes (code, then secret hash).
vi.mock("drizzle-orm", async (importOriginal) => ({
  ...(await importOriginal<typeof import("drizzle-orm")>()),
  eq: (column: unknown, value: unknown) => ({ eq: value, column }),
  and: (...parts: unknown[]) => ({ and: parts }),
}));
vi.mock("../../db", () => ({
  db: {
    select: (shape?: unknown) => ({
      from: () => ({
        where: async (cond: { and?: { eq: unknown }[]; eq?: unknown }) => {
          const values = cond.and ? cond.and.map((c) => c.eq) : [cond.eq];
          const rows = m.claims.filter((r) => values.every((v) => v === r.codeId || v === r.claimSecretHash));
          // The second read (a shape given) is the count: every claim on the code, state and hold only.
          return shape ? rows.map((r) => ({ state: r.state, holdsUntil: r.holdsUntil })) : rows;
        },
      }),
    }),
  },
}));
vi.mock("./claim", () => ({ findFlyerCode: m.findFlyerCode }));
vi.mock("../switches/snapshot", () => ({ resolveSwitchEnv: m.resolveSwitchEnv }));
vi.mock("../invites/read", () => ({ loadInviteCount: m.loadInviteCount }));

import { CODE_MAX_TRIES, CODE_RESEND_MS, CODE_TTL_MS } from "../invites/rules";
import { secretHash } from "../invites/tokens";
import { readFlyerJoin } from "./join-read";
import { FLYER_HOLD_MS, FLYER_PROVEN_HOLD_MS } from "./rules";

describe("readFlyerJoin, a code nobody made", () => {
  beforeEach(() => {
    m.findFlyerCode.mockReset().mockResolvedValue(null);
    m.resolveSwitchEnv.mockReset();
  });

  it("reads E3 (launched) when the app-wide switch is off, so the form that would answer `launched` is not drawn", async () => {
    m.resolveSwitchEnv.mockResolvedValue({ FLYER_TRIAL_ENABLED: "off" });
    expect(await readFlyerJoin("MAX4QK", null)).toEqual({ kind: "launched" });
    expect(m.resolveSwitchEnv).toHaveBeenCalledWith(null);
  });

  it("reads E2 (revoked) while the trial is on", async () => {
    m.resolveSwitchEnv.mockResolvedValue({ FLYER_TRIAL_ENABLED: "true" });
    expect(await readFlyerJoin("MAX4QK", null)).toEqual({ kind: "closed", closed: "revoked" });
  });
});

describe("readFlyerJoin, a reopened page (the browser's claim cookie)", () => {
  const NOW = new Date("2026-10-30T12:00:00Z");
  const at = (ms: number) => new Date(NOW.getTime() + ms);
  const MINE = "a".repeat(43);
  const OTHER = "b".repeat(43);
  const CODE_ID = "code-1";
  const EMAIL = "mine@x.dev";
  const claim = (o: Record<string, unknown> = {}) => ({
    id: "claim-1", codeId: CODE_ID, state: "open", email: EMAIL, claimSecretHash: secretHash(MINE),
    createdAt: at(-1000), holdsUntil: at(FLYER_HOLD_MS), codeSentAt: at(-1000), codeExpiresAt: at(CODE_TTL_MS), codeTries: 0, ...o,
  });
  const read = (secret: string | null) => readFlyerJoin("MAX4QK", secret, NOW);

  beforeEach(() => {
    m.findFlyerCode.mockReset().mockResolvedValue({ id: CODE_ID, createdBy: "hugh", capacity: 50, revokedAt: null });
    m.resolveSwitchEnv.mockReset().mockResolvedValue({ FLYER_TRIAL_ENABLED: "true" });
    m.loadInviteCount.mockReset().mockResolvedValue({ left: 10 });
    m.claims = [];
  });

  it("the claiming browser resumes at the code step with the resend wait left", async () => {
    m.claims = [claim()];
    expect(await read(MINE)).toEqual({ kind: "code", email: EMAIL, resendWaitMs: CODE_RESEND_MS - 1000, expired: false });
  });

  it("an emailed code past its ten minutes still resumes at the code step, marked expired", async () => {
    m.claims = [claim({ codeSentAt: at(-CODE_TTL_MS - 5000), codeExpiresAt: at(-1) })];
    expect(await read(MINE)).toEqual({ kind: "code", email: EMAIL, resendWaitMs: 0, expired: true });
  });

  it("a claim too near its ceiling resumes with the rest of its hold as the resend wait", async () => {
    m.claims = [claim({ createdAt: at(-21 * 60_000), holdsUntil: at(8 * 60_000), codeSentAt: at(-120_000) })];
    expect(await read(MINE)).toEqual({ kind: "code", email: EMAIL, resendWaitMs: 8 * 60_000, expired: false });
  });

  it("a proven claim resumes at the hand-over", async () => {
    m.claims = [claim({ state: "proven", holdsUntil: at(FLYER_PROVEN_HOLD_MS) })];
    expect(await read(MINE)).toEqual({ kind: "proven", email: EMAIL });
  });

  it("another browser's secret, no secret and a malformed one read the email step and never carry the claim's address", async () => {
    m.claims = [claim()];
    for (const secret of [OTHER, null, "short"]) {
      const view = await read(secret);
      expect(view).toEqual({ kind: "email" });
      expect(JSON.stringify(view)).not.toContain(EMAIL);
    }
  });

  it("a claim whose ten minutes ran out, a released one and a spent one no longer resume: the email step", async () => {
    for (const over of [{ holdsUntil: at(-1) }, { state: "released" }, { state: "spent" }]) {
      m.claims = [claim(over)];
      expect(await read(MINE)).toEqual({ kind: "email" });
    }
  });

  it("a claim out of tries, or one with no address yet, does not resume", async () => {
    m.claims = [claim({ codeTries: CODE_MAX_TRIES })];
    expect(await read(MINE)).toEqual({ kind: "email" });
    m.claims = [claim({ email: null })];
    expect(await read(MINE)).toEqual({ kind: "email" });
  });

  describe("an owned claim holding the code's last place", () => {
    beforeEach(() => {
      m.findFlyerCode.mockResolvedValue({ id: CODE_ID, createdBy: "hugh", capacity: 1, revokedAt: null });
      m.claims = [claim()];
    });

    it("still resumes for its own browser instead of reading the code as full", async () => {
      expect(await read(MINE)).toEqual({ kind: "code", email: EMAIL, resendWaitMs: CODE_RESEND_MS - 1000, expired: false });
    });

    it("reads full to any other browser, without the holder's address", async () => {
      const view = await read(OTHER);
      expect(view).toEqual({ kind: "closed", closed: "full" });
      expect(JSON.stringify(view)).not.toContain(EMAIL);
    });

    it("frees the place for everyone once the hold runs out, and its owner starts over", async () => {
      m.claims = [claim({ holdsUntil: at(-1) })];
      expect(await read(MINE)).toEqual({ kind: "email" });
      expect(await read(OTHER)).toEqual({ kind: "email" });
    });
  });

  it("a revoked code or an off switch wins over a standing claim", async () => {
    m.claims = [claim()];
    m.findFlyerCode.mockResolvedValue({ id: CODE_ID, createdBy: "hugh", capacity: 50, revokedAt: at(-1) });
    expect(await read(MINE)).toEqual({ kind: "closed", closed: "revoked" });
    m.findFlyerCode.mockResolvedValue({ id: CODE_ID, createdBy: "hugh", capacity: 50, revokedAt: null });
    m.resolveSwitchEnv.mockResolvedValue({ FLYER_TRIAL_ENABLED: "off" });
    expect(await read(MINE)).toEqual({ kind: "launched" });
  });
});
