import { beforeEach, describe, expect, it, vi } from "vitest";

const enabled = { on: true };
vi.mock("../../lib/auth", () => ({ requireUserId: vi.fn(async () => "u1") }));
vi.mock("../../lib/flags/request", () => ({ requestFlags: vi.fn(async () => ({})) }));
vi.mock("../../lib/precons/upgrade/flag", () => ({ preconUpgradeEnabled: () => enabled.on }));
vi.mock("../../lib/decks/revalidate-claims", () => ({ revalidateClaims: vi.fn() }));
vi.mock("../../lib/precons/upgrade/deck-apply", () => ({
  applyUpgradeOnDeck: vi.fn(async () => ({ ok: true, swaps: 14, lead: null })),
  undoUpgradeOnDeck: vi.fn(async () => ({ ok: true })),
}));

const { applyPreconUpgradeOnDeck, undoPreconUpgradeOnDeck } = await import("./precon-upgrade-deck-actions");
const { applyUpgradeOnDeck, undoUpgradeOnDeck } = await import("../../lib/precons/upgrade/deck-apply");
const { revalidateClaims } = await import("../../lib/decks/revalidate-claims");

const DECK = "22222222-2222-4222-8222-222222222222";
const RUN = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  enabled.on = true;
  vi.clearAllMocks();
});

describe("applyPreconUpgradeOnDeck / undoPreconUpgradeOnDeck", () => {
  it("apply and undo the reader's own deck, and revalidate its claim surfaces on success", async () => {
    expect(await applyPreconUpgradeOnDeck(DECK, RUN)).toEqual({ ok: true, swaps: 14, lead: null });
    expect(applyUpgradeOnDeck).toHaveBeenCalledWith("u1", DECK, RUN);
    expect(await undoPreconUpgradeOnDeck(DECK, RUN)).toEqual({ ok: true });
    expect(undoUpgradeOnDeck).toHaveBeenCalledWith("u1", DECK, RUN);
    expect(revalidateClaims).toHaveBeenCalledTimes(2);
  });

  it("refuse with the switch off, and write nothing", async () => {
    enabled.on = false;
    expect(await applyPreconUpgradeOnDeck(DECK, RUN)).toEqual({ ok: false, reason: "closed" });
    expect(await undoPreconUpgradeOnDeck(DECK, RUN)).toEqual({ ok: false });
    expect(applyUpgradeOnDeck).not.toHaveBeenCalled();
    expect(undoUpgradeOnDeck).not.toHaveBeenCalled();
  });

  it("refuse an id that is not a uuid, on either side", async () => {
    expect(await applyPreconUpgradeOnDeck("nope", RUN)).toEqual({ ok: false, reason: "closed" });
    expect(await applyPreconUpgradeOnDeck(DECK, "nope")).toEqual({ ok: false, reason: "closed" });
    expect(await undoPreconUpgradeOnDeck(DECK, "nope")).toEqual({ ok: false });
    expect(applyUpgradeOnDeck).not.toHaveBeenCalled();
    expect(undoUpgradeOnDeck).not.toHaveBeenCalled();
  });

  it("revalidate nothing when the write refuses", async () => {
    vi.mocked(applyUpgradeOnDeck).mockResolvedValueOnce({ ok: false, reason: "locked" });
    vi.mocked(undoUpgradeOnDeck).mockResolvedValueOnce({ ok: false });
    expect(await applyPreconUpgradeOnDeck(DECK, RUN)).toEqual({ ok: false, reason: "locked" });
    expect(await undoPreconUpgradeOnDeck(DECK, RUN)).toEqual({ ok: false });
    expect(revalidateClaims).not.toHaveBeenCalled();
  });
});
