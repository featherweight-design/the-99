import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ rows: [] as unknown[], sender: vi.fn() }));
vi.mock("../../db", () => ({ db: { select: () => ({ from: () => ({ where: async () => m.rows }) }) } }));
vi.mock("../social/friends", () => ({ readInviteSender: m.sender }));

import { readHero } from "./hero-read";
import { heroKey } from "./tokens";

const SECRET = "ab".repeat(32);
const ID = "0a1b2c3d-4e5f-4061-8273-8495a6b7c8d9";
const KEY = heroKey(SECRET, ID)!;
const NOW = new Date("2026-11-14T12:00:00Z");
const row = (over: Record<string, unknown> = {}) => ({
  id: ID, userId: "user_sender", kind: "email", state: "reserved", qrExpiresAt: null, holdsUntil: new Date(NOW.getTime() + 86_400_000), ...over,
});
const SENDER = { displayName: { brand: "name" }, commander: { oracleId: "o", name: "Ghalta, Primal Hunger", artCropUri: "https://cards.scryfall.io/art_crop/x.jpg" } };

beforeEach(() => {
  m.rows = [row()];
  m.sender.mockReset().mockResolvedValue(SENDER);
});

describe("readHero", () => {
  it("draws the sender's hand for a live email invite, with only the name and the commander's art", async () => {
    const view = await readHero(KEY, SECRET, NOW);
    expect(view).toEqual({ kind: "hand", name: SENDER.displayName, commander: { name: "Ghalta, Primal Hunger", artCropUri: SENDER.commander.artCropUri } });
    expect(m.sender).toHaveBeenCalledWith("user_sender");
  });

  it("answers the plain hand, never an error, for a key this server did not make, a missing secret or a gone row", async () => {
    for (const [key, secret] of [["x".repeat(59), SECRET], [KEY, null], [KEY, "cd".repeat(32)]] as const) {
      expect(await readHero(key, secret, NOW)).toEqual({ kind: "plain" });
    }
    m.rows = [];
    expect(await readHero(KEY, SECRET, NOW)).toEqual({ kind: "plain" });
    expect(m.sender).not.toHaveBeenCalled();
  });

  it("answers the plain hand once the invite has ended or is not an email invite", async () => {
    for (const over of [{ state: "spent" }, { state: "returned" }, { state: "revoked" }, { holdsUntil: new Date(NOW.getTime() - 1) }, { kind: "qr", state: "qr_open", qrExpiresAt: new Date(NOW.getTime() + 60_000) }]) {
      m.rows = [row(over)];
      expect(await readHero(KEY, SECRET, NOW), JSON.stringify(over)).toEqual({ kind: "plain" });
    }
    expect(m.sender).not.toHaveBeenCalled();
  });

  it("answers the plain hand when the sender has no commander art or no profile", async () => {
    m.sender.mockResolvedValueOnce({ ...SENDER, commander: null });
    expect(await readHero(KEY, SECRET, NOW)).toEqual({ kind: "plain" });
    m.sender.mockResolvedValueOnce({ ...SENDER, commander: { ...SENDER.commander, artCropUri: null } });
    expect(await readHero(KEY, SECRET, NOW)).toEqual({ kind: "plain" });
    m.sender.mockResolvedValueOnce(null);
    expect(await readHero(KEY, SECRET, NOW)).toEqual({ kind: "plain" });
  });
});
