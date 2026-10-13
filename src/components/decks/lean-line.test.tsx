// The lean and its reasoning, through a REAL profile and the REAL verdict: whether a lean exists
// at all, and which pair it names, are the verdict's decisions, and a hand-written lean can hold a
// shape `leanFor` never returns.
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

import type { BrowseCard } from "../../lib/collection/browse";
import { slotDeck } from "../../lib/bracket/slot";
import { SPELLBOOK_SOURCE } from "../../lib/bracket/sources";
import type { ComboRef } from "../../lib/profile/types";
import { deckAnalysisCopy } from "../../lib/copy/deck-analysis";
import { COMMANDER, deckProfile, profileCard } from "./__fixtures__/deck-profile";

vi.mock("../../app/collection/actions", () => ({
  setCardArtPreference: vi.fn(async () => true),
  clearCardArtPreference: vi.fn(async () => {}),
}));
vi.mock("../../app/decks/actions", () => ({ setCardProxied: vi.fn(async () => ({ ok: true })) }));

const { CardDetailProvider } = await import("../cards/card-detail-provider");
// The modal is loaded on demand; loaded here, after the mocks, a press draws it in the same tick.
await (await import("../cards/card-detail-provider")).warmCardModal();
const { AnalysisPanel } = await import("./analysis-panel");

const copy = deckAnalysisCopy;

const combo = (pieces: [string, string]): ComboRef => ({
  variantId: "1295-2853",
  cards: pieces.map((p) => ({ oracleId: p, name: p })),
  produces: ["Win the game"],
  bracketTag: "ruthless",
  usesCommander: false,
  manaValueNeeded: 0,
  manaNeeded: null,
  steps: null,
  notablePrerequisites: null,
});

/** A combo in the list, and tutors that each find ONE half, so together they cover the pair. */
const REACHABLE = () =>
  deckProfile({
    cards: [COMMANDER, ...["oracle", "lash", "t-oracle", "t-lash"].map((id) => profileCard(id))],
    twoCardCombos: [combo(["oracle", "lash"])],
    tutorIds: new Set(["t-oracle", "t-lash"]),
    tutorReaches: (tutor, piece) => tutor === `t-${piece.oracleId}`,
  });

/** The same combo with nothing in the deck that searches for either half. */
const DRAW_ONLY = () =>
  deckProfile({
    cards: [COMMANDER, profileCard("oracle"), profileCard("lash")],
    twoCardCombos: [combo(["oracle", "lash"])],
  });

/** One half IS the commander, and one tutor finds the other. */
const COMMANDER_HALF = () =>
  deckProfile({
    cards: [COMMANDER, profileCard("lash"), profileCard("t-lash")],
    twoCardCombos: [{ ...combo([COMMANDER.oracleId, "lash"]), usesCommander: true }],
    tutorIds: new Set(["t-lash"]),
    tutorReaches: (tutor, piece) => tutor === `t-${piece.oracleId}`,
  });

const card = (oracleId: string) =>
  ({
    oracleId, name: oracleId, typeLine: "Instant", manaCost: "{U}", cmc: 1, oracleText: null,
    keywords: [], rarity: "rare", colorIdentity: [], imageUri: null, printings: [], owned: [],
    proxiedBy: [],
  }) as unknown as BrowseCard;

const draw = (profile: ReturnType<typeof deckProfile>) =>
  render(
    <CardDetailProvider fetchCard={async (id) => card(id)}>
      <AnalysisPanel state={{ kind: "ready", profile, analyzedAt: new Date().toISOString(), fresh: true, versionNumber: null }} onRequest={() => {}} />
    </CardDetailProvider>,
  );

describe("the lean", () => {
  it("is drawn on a reachable deck, which the verdict puts at 4", () => {
    const profile = REACHABLE();
    expect(slotDeck(profile).permits).toEqual([4]);
    draw(profile);
    const lean = screen.getByTestId("lean-line");
    expect(lean.dataset.reason).toBe("reachable");
    expect(lean.textContent).toContain(copy.lean.reachable("oracle", "lash"));
  });

  it("is drawn on a draw-only deck, which the verdict keeps at 3", () => {
    const profile = DRAW_ONLY();
    expect(slotDeck(profile).permits).toEqual([3]);
    draw(profile);
    expect(screen.getByTestId("lean-line").textContent).toContain(copy.lean.drawOnly("oracle", "lash"));
  });

  // The ask and the lean never co-occur: a range carries no lean. The deck holds a combo AND four
  // game changers, so it reaches [4,5] with a combo present — a deck with no combo would return
  // null for the combo's absence and prove nothing about the range.
  it("is not drawn on a range, even with a combo in the deck", () => {
    const gcs = ["g1", "g2", "g3", "g4"];
    const profile = deckProfile({
      cards: [COMMANDER, profileCard("oracle"), profileCard("lash"), ...gcs.map((g) => profileCard(g))],
      gameChangerIds: new Set(gcs),
      twoCardCombos: [combo(["oracle", "lash"])],
    });
    expect(slotDeck(profile).permits).toEqual([4, 5]);
    draw(profile);
    expect(screen.queryByTestId("lean-line")).toBeNull();
  });

  // `drawOnly` is any coverage short of every piece, so one tutored half must not read as none.
  it("says one half is findable when a tutor covers one half", () => {
    const profile = deckProfile({
      cards: [COMMANDER, profileCard("oracle"), profileCard("lash"), profileCard("t-oracle")],
      twoCardCombos: [combo(["oracle", "lash"])],
      tutorIds: new Set(["t-oracle"]),
      tutorReaches: (tutor, piece) => tutor === `t-${piece.oracleId}`,
    });
    expect(slotDeck(profile).permits).toEqual([3]);
    draw(profile);
    const lean = screen.getByTestId("lean-line");
    expect(lean.dataset.reading).toBe("oneHalf");
    expect(lean.textContent).toContain(copy.lean.oneHalf("oracle", "lash"));
    fireEvent.click(within(lean).getByRole("button", { name: copy.lean.open }));
    expect(screen.getByTestId("receipt-modal").textContent).toContain(copy.reasoning.qualifierOneHalf(3));
  });

  // Draw-only combos are not alike: the one named is the best covered, whatever the join's order.
  it("names the best-covered pair on a draw-only deck", () => {
    const profile = deckProfile({
      cards: [COMMANDER, ...["a", "b", "c", "d", "t-c"].map((id) => profileCard(id))],
      twoCardCombos: [{ ...combo(["a", "b"]), variantId: "first" }, { ...combo(["c", "d"]), variantId: "second" }],
      tutorIds: new Set(["t-c"]),
      tutorReaches: (tutor, piece) => tutor === `t-${piece.oracleId}`,
    });
    expect(slotDeck(profile).permits).toEqual([3]);
    draw(profile);
    expect(screen.getByTestId("lean-line").textContent).toContain(copy.lean.oneHalf("c", "d"));
  });

  it("joins every reading's parts into its sentence", () => {
    for (const k of ["reachable", "reachableCommander", "reachableZone", "oneHalf", "drawOnly"] as const) {
      expect(copy.lean[`${k}Parts`]("a", "b").join("")).toBe(copy.lean[k]("a", "b"));
    }
  });

  // A commander half is covered by the zone, not a tutor, and the sentence must not say otherwise.
  it("credits the command zone, not the tutors, with a commander half", () => {
    const profile = COMMANDER_HALF();
    expect(slotDeck(profile).permits).toEqual([4]);
    draw(profile);
    const lean = screen.getByTestId("lean-line");
    expect(lean.dataset.reading).toBe("reachableCommander");
    expect(lean.textContent).toContain(copy.lean.reachableCommander(COMMANDER.oracleId, "lash"));
    fireEvent.click(within(lean).getByRole("button", { name: copy.lean.open }));
    expect(screen.getByTestId("receipt-modal").textContent).toContain(copy.reasoning.thresholdCommander);
  });

  it("joins its parts into the sentence the copy file states", () => {
    expect(copy.lean.reachableParts("a", "b").join("")).toBe(copy.lean.reachable("a", "b"));
    expect(copy.lean.drawOnlyParts("a", "b").join("")).toBe(copy.lean.drawOnly("a", "b"));
  });

  it("makes the two names open their cards", () => {
    draw(REACHABLE());
    const lean = screen.getByTestId("lean-line");
    expect(within(lean).getByRole("button", { name: "View details for oracle" })).toBeTruthy();
    expect(within(lean).getByRole("button", { name: "View details for lash" })).toBeTruthy();
  });
});

describe("the reasoning", () => {
  const open = () => {
    fireEvent.click(within(screen.getByTestId("lean-line")).getByRole("button", { name: copy.lean.open }));
    return screen.getByTestId("receipt-modal");
  };

  it("titles the bracket by number and qualifies it by name", () => {
    draw(REACHABLE());
    const modal = open();
    expect(within(modal).getByRole("heading", { name: copy.reasoning.title(4) })).toBeTruthy();
    expect(modal.textContent).toContain(copy.reasoning.qualifierReachable(4));
  });

  it("groups the tutors by the half they find", () => {
    draw(REACHABLE());
    const pieces = within(open()).getAllByTestId("reasoning-piece");
    expect(pieces).toHaveLength(2);
    expect(within(pieces[0]).getByRole("button", { name: "View details for t-oracle" })).toBeTruthy();
    expect(within(pieces[0]).queryByRole("button", { name: "View details for t-lash" })).toBeNull();
    expect(within(pieces[1]).getByRole("button", { name: "View details for t-lash" })).toBeTruthy();
  });

  it("says nothing searches for a half with no tutor, rather than leaving the slot empty", () => {
    draw(DRAW_ONLY());
    const modal = open();
    expect(modal.textContent).toContain(copy.reasoning.qualifierDrawOnly(3));
    const found = within(modal).getAllByTestId("reasoning-piece").map((p) => p.querySelector("[data-found]")!.getAttribute("data-found"));
    expect(found).toEqual(["none", "none"]);
  });

  // The commander is in the zone every game, so its half is covered with no tutor.
  it("reads a commander half as the command zone, not as unfound", () => {
    const profile = COMMANDER_HALF();
    expect(slotDeck(profile).permits).toEqual([4]);
    draw(profile);
    const pieces = within(open()).getAllByTestId("reasoning-piece");
    expect(pieces[0].querySelector("[data-found]")!.getAttribute("data-found")).toBe("command-zone");
    expect(pieces[0].textContent).toContain(copy.reasoning.pieceCommander(1));
    expect(pieces[1].querySelector("[data-found]")!.getAttribute("data-found")).toBe("tutors");
  });

  it("links the combo to Spellbook and says tutors are not a limit", () => {
    draw(REACHABLE());
    const modal = open();
    expect(within(modal).getByRole("link").getAttribute("href")).toBe(SPELLBOOK_SOURCE.variantUrl("1295-2853"));
    expect(modal.textContent).toContain(copy.reasoning.tutorsAreNotALimit);
  });
});
