import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { DeckUpgrade } from "../../../../lib/precons/upgrade/deck-read";
import type { UpgradePanel } from "../../../../lib/precons/upgrade/run";
import { runKey } from "../../../../lib/precons/upgrade/targets";

const refresh = vi.fn();
const apply = vi.fn();
const undo = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("../../../../app/decks/precon-upgrade-deck-actions", () => ({
  applyPreconUpgradeOnDeck: (...a: unknown[]) => apply(...a),
  undoPreconUpgradeOnDeck: (...a: unknown[]) => undo(...a),
}));
vi.mock("../../../../lib/precons/upgrade/actions", () => ({
  readUpgradeAction: vi.fn(async () => null), pressUpgradeAction: vi.fn(), markUpgradeSeenAction: vi.fn(async () => ({ ok: true })),
  pickUpgradeLineAction: vi.fn(async () => ({ ok: true, unpicked: [] })), upgradeSetBracketAction: vi.fn(async () => null),
}));
// The result's lists are Suggested changes' own (fresh start R2): their lines read the deck page's card details.
vi.mock("../../../cards/card-detail-context", async (importActual) => ({
  ...(await importActual<typeof import("../../../cards/card-detail-context")>()),
  useCardDetail: () => ({ open: vi.fn(), registerSheet: () => () => {}, openOracleId: null, revealing: false, prefetch: () => {} }),
  useCardIntent: () => ({}),
}));
vi.mock("../../../../app/decks/actions", () => ({ pullCardFromDeck: vi.fn() }));

const { DeckUpgradeHost } = await import("./deck-upgrade");
const { readUpgradeAction } = await import("../../../../lib/precons/upgrade/actions");

const DECK = "22222222-2222-4222-8222-222222222222";
const strat = { key: "tokens", label: "Tokens", blurb: "b", source: "edhrec" as const, backingIds: [], backing: [] };
const panel: UpgradePanel = {
  boxBracket: 2,
  figures: {},
  commanders: [
    { key: "rootha", isFace: true, cards: [{ oracleId: "rootha", name: "Rootha", manaCost: null, cmc: 4, typeLine: "Legendary Creature" }], line: "", strategies: [strat] },
    { key: "muddle", isFace: false, cards: [{ oracleId: "muddle", name: "Muddle", manaCost: null, cmc: 4, typeLine: "Legendary Creature" }], line: "", strategies: [strat] },
  ],
  runs: [{
    id: "r1", status: "done", strategyKey: runKey("muddle", 3, "tokens"), strategyLabel: "Tokens", refunded: false, createdAt: new Date("2026-11-10T12:00:00Z"),
    pairs: [{ cutId: "a", addId: "b", cut: "A", add: "B", addCents: 100, reason: "r", cutReason: null, position: 0 }] as never,
    buyTotalCents: 0, bracketBefore: 2, bracketAfter: 3, bracketTarget: 3, listFp: "x", toBuy: { cards: 0, cents: 0 }, owned: 0, themes: {}, deck: null, seenAt: new Date("2026-11-10T12:01:00Z"), unpicked: [],
  }],
  listFp: "x", cards: {}, allowance: { used: 0, limit: 5, reopensAt: null, nextAt: null },
};
const arrival = { name: "Prismari Artistry", setCode: "pca", cards: 100, unmapped: 0, owned: 41, of: 85 };
const upgrade = (over: Partial<DeckUpgrade> = {}): DeckUpgrade => ({
  fileName: "prismari.json", precon: "Prismari Artistry", kind: "started", nextVersion: 1, panel, arrival, art: [], ...over,
});
const host = (over: Partial<Parameters<typeof DeckUpgradeHost>[0]> = {}) =>
  render(<DeckUpgradeHost deckId={DECK} upgrade={upgrade()} receipt={null} commanderArt={[]} {...over} />);

/** The band's press opens the start screen (addendum fresh start, call 12); its `Your last upgrade` row opens the run. */
function openLast() {
  fireEvent.click(screen.getByRole("button", { name: "Upgrade precon" }));
  fireEvent.click(document.querySelector("[data-last-run] button")!);
}

beforeEach(() => { refresh.mockReset(); apply.mockReset(); undo.mockReset(); });

describe("DeckUpgradeHost (A2c)", () => {
  it("draws the band with the press, the head in both widths' words, and what you own, with no ✕", () => {
    host();
    expect(screen.getByText("From the Prismari Artistry precon")).toBeInTheDocument();
    expect(screen.getByText("Started from the Prismari Artistry precon")).toBeInTheDocument();
    expect(screen.getByText("You own 41 of its 85.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upgrade precon" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /dismiss|close/i })).toBeNull();
  });

  it("says a linked deck is linked", () => {
    host({ upgrade: upgrade({ kind: "linked" }) });
    expect(screen.getByText("Linked to the Prismari Artistry precon")).toBeInTheDocument();
  });

  it("on the visit after a start, is the arrival receipt with the press in its ✕'s place", () => {
    const onDismiss = vi.fn();
    host({ receipt: { arrival, added: null, onDismiss } });
    expect(screen.getByText("Started from the Prismari Artistry precon")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upgrade precon" })).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("draws the shipped receipt alone, ✕ and all, when the deck can't take an upgrade", () => {
    host({ upgrade: null, receipt: { arrival, added: null, onDismiss: vi.fn() } });
    expect(screen.queryByRole("button", { name: "Upgrade precon" })).toBeNull();
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("applies from the result, says who leads in the toast, refreshes the page, and Undo puts it back", async () => {
    apply.mockResolvedValue({ ok: true, swaps: 1, lead: "muddle" });
    undo.mockResolvedValue({ ok: true });
    host();
    openLast();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Apply these 1 swaps" })); });
    // The picks go with it (fresh start R2): every add and cut, as none was unpicked.
    expect(apply).toHaveBeenCalledWith(DECK, "r1", { adds: ["b"], cuts: ["a"] });
    expect(screen.getByText("Applied 1 swaps. Muddle leads.")).toBeInTheDocument();
    expect(refresh).toHaveBeenCalledTimes(1);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Undo" })); });
    expect(undo).toHaveBeenCalledWith(DECK, "r1");
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("keeps the flow on the result and says a locked cut in its foot", async () => {
    apply.mockResolvedValue({ ok: false, reason: "locked" });
    host();
    openLast();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Apply these 1 swaps" })); });
    expect(screen.getByRole("note")).toHaveTextContent("Unlock it to apply the swaps.");
    expect(screen.getByRole("button", { name: "Apply these 1 swaps" })).toHaveAttribute("aria-disabled", "true");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("says stale picks in the foot, without refreshing the page", async () => {
    apply.mockResolvedValue({ ok: false, reason: "picks" });
    host();
    openLast();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Apply these 1 swaps" })); });
    expect(screen.getByRole("note")).toHaveTextContent("Your picks no longer match this upgrade. Open it again to pick.");
    expect(refresh).not.toHaveBeenCalled();
    expect(screen.queryByText("Those swaps didn’t apply. Your deck hasn’t changed.")).toBeNull();
  });

  it("says a failed write in the shared toast, and the flow stays", async () => {
    apply.mockRejectedValue(new Error("network"));
    host();
    openLast();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Apply these 1 swaps" })); });
    expect(screen.getByText("Those swaps didn’t apply. Your deck hasn’t changed.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply these 1 swaps" })).not.toHaveAttribute("aria-disabled");
  });

  it("opens on the start screen with the kept run as Your last upgrade, A2c's intro line under it (call 12)", () => {
    host();
    fireEvent.click(screen.getByRole("button", { name: "Upgrade precon" }));
    expect(screen.queryByRole("button", { name: "Apply these 1 swaps" })).toBeNull();
    expect(screen.getByText("Your last upgrade")).toBeInTheDocument();
    expect(document.querySelector("[data-last-run] [data-run-went]")!.textContent).toBe("1 swaps · no deck yet");
    expect(screen.getByText("Nothing changes until you apply the swaps.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "History" })).toBeInTheDocument();
  });

  it("a run applied to another deck reads in that deck, and still applies here under the note", () => {
    host({ upgrade: upgrade({ panel: { ...panel, runs: [{ ...panel.runs[0], deck: { id: "d9", name: "Muddle Tokens" } }] } }) });
    fireEvent.click(screen.getByRole("button", { name: "Upgrade precon" }));
    expect(document.querySelector("[data-last-run] [data-run-went]")!.textContent).toBe("1 swaps · in Muddle Tokens");
    fireEvent.click(document.querySelector("[data-last-run] button")!);
    expect(screen.getByText("Already in Muddle Tokens. Opening it again uses no credit.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply these 1 swaps" })).toBeEnabled();
  });
});

describe("DeckUpgradeHost's band press pulses when a run lands while closed (addendum A3, G21)", () => {
  afterEach(() => { vi.useRealTimers(); vi.mocked(readUpgradeAction).mockReset(); vi.mocked(readUpgradeAction).mockResolvedValue(null); });
  const bandPress = () => screen.getByRole("button", { name: /^(Upgrade precon|Upgrading toward)/ });
  const pending = { ...panel.runs[0], id: "p1", status: "pending" as const, createdAt: new Date() };
  const landed = { ...panel.runs[0], id: "p1", createdAt: new Date("2026-11-12T12:00:00Z"), seenAt: null };

  it("replays the pulse when the watched run lands done, and the next open shows it", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(readUpgradeAction).mockResolvedValue({ ...panel, runs: [landed, panel.runs[0]] });
    host({ upgrade: upgrade({ panel: { ...panel, runs: [pending, panel.runs[0]] } }) });
    expect(bandPress()).toHaveTextContent(/^Upgrading toward Tokens/);
    expect(bandPress().querySelector(".anim-line-pulse")).toBeNull();
    await act(async () => { await vi.advanceTimersByTimeAsync(3100); });
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    expect(bandPress()).toHaveTextContent("Upgrade precon");
    expect(bandPress().querySelector(".anim-line-pulse")).not.toBeNull();
    fireEvent.click(bandPress());
    expect(screen.getByRole("dialog", { name: "Your upgrade" })).toBeInTheDocument();
  });

  it("plays no pulse when the watched run fails, and the press then opens the start screen with the older kept run", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(readUpgradeAction).mockResolvedValue({ ...panel, runs: [{ ...pending, status: "failed" as const, refunded: true }, panel.runs[0]] });
    host({ upgrade: upgrade({ panel: { ...panel, runs: [pending, panel.runs[0]] } }) });
    await act(async () => { await vi.advanceTimersByTimeAsync(3100); });
    await act(async () => { await vi.advanceTimersByTimeAsync(700); });
    expect(bandPress()).toHaveTextContent("Upgrade precon");
    expect(bandPress().querySelector(".anim-line-pulse")).toBeNull();
    fireEvent.click(bandPress());
    expect(screen.getByRole("dialog", { name: "Upgrade Prismari Artistry" })).toBeInTheDocument();
    expect(document.querySelector("[data-last-run] [data-run-row]")!.getAttribute("data-run-row")).toBe("r1");
  });
});
