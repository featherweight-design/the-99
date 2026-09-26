// §Surfaces 2 — the review page. What is asserted here is what the player can
// read off the two columns before the one irreversible click: which cards move,
// which way, by how many copies, and what each one will cost. The page's one
// write is the pull, and `pull-control.test.tsx` owns what that control does —
// asserted here is only which rows are given one.

import { lockedCardsCopy } from "../../lib/copy/locked-cards";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deckImportCopy } from "../../lib/copy/deck-import";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import type { BrowseCard } from "../../lib/collection/browse";
import type { Availability } from "../../lib/decks/availability";
import type { ContestedCard } from "../../lib/collection/summary-read";
import { cardAssignmentsCopy } from "../../lib/copy/card-assignments";
import type { ShapeCard } from "../../lib/decks/draft-state";
import { cardDetailCopy } from "../cards/card-detail-provider";
import { BREW, COMMITTED } from "./__fixtures__/draft-state";
import { ReviewChanges } from "./review-changes";
import { proxyCopy } from "../../lib/copy/proxies";
import { recommendedMix } from "../../lib/decks/mix";

/** The asserted baseline, through the real function rather than restated — a hand-built
 *  literal drifts from the type the moment a field is added, which is how 120 of these broke. */
const TEST_MIX = recommendedMix(null, false);

const refresh = vi.fn();
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push }) }));

const addCardToDeck = vi.fn<(deckId: string, oracleId: string, opts?: { relock?: boolean }) => Promise<{ ok: boolean; message?: string }>>(
  async () => ({ ok: true }),
);
// The other two writes to the same draft, held rather than stubbed: the latch
// this page keeps is about all three, so a test that cannot pause a commit
// cannot say whether a commit shuts anything.
const commitDeckVersion = vi.fn<(deckId: string, note: string) => Promise<unknown>>(
  async () => ({ ok: true, number: 2, cardCount: CARD_COUNT, buy: [], pull: [] }),
);
const discardDeckDraft = vi.fn<(deckId: string, versionId: string) => Promise<unknown>>(
  async () => ({ ok: true }),
);
vi.mock("../../app/decks/actions", () => ({
  addCardToDeck: (deckId: string, oracleId: string, opts?: { relock?: boolean }) => addCardToDeck(deckId, oracleId, opts),
  commitDeckVersion: (deckId: string, note: string) => commitDeckVersion(deckId, note),
  discardDeckDraft: (deckId: string, versionId: string) => discardDeckDraft(deckId, versionId),
  pullCardFromDeck: vi.fn(async () => ({ ok: true, buy: 0, total: null })),
}));

// The page mounts its own provider, so the modal's paging is reachable only
// through the read that provider does — there is no `fetchCard` to inject.
const { getCardDetail } = vi.hoisted(() => ({ getCardDetail: vi.fn() }));
vi.mock("../../app/card-detail-action", () => ({ getCardDetail }));

const browseCard = (oracleId: string, name: string): BrowseCard => ({
  oracleId, name, typeLine: "Artifact", manaCost: "{1}", cmc: 1, oracleText: "", keywords: [],
  rarity: "uncommon", colorIdentity: [], imageUri: null, printedName: null, quantity: 0,
  printings: [], setCodes: [], primarySetCode: "", preferredPrinting: null,
});

const STATE = COMMITTED;

/** The shape strip's two whole lists, empty here: what this suite asserts is the
 *  two columns, and `changed-strip.test.tsx` owns every figure the strip draws
 *  from them. Empty `before` is also what keeps the strip silent about movement,
 *  so nothing it draws can be mistaken for a column's own figure. */
// `contested` rides with the shape props because nearly every case here is about a row rather
// than about the chooser: an empty list draws no panel, which is the state these were written in.
const SHAPE: { before: ShapeCard[]; after: ShapeCard[]; contested: ContestedCard[] } =
  { before: [], after: [], contested: [] };

/** The server's count of the list a commit would freeze, handed down to the sheet
 *  at the foot of the page. Nothing here counts rows to get it. */
const CARD_COUNT = 99;

type Row = Parameters<typeof ReviewChanges>[0]["rows"]["in"][number];

const row = (over: Partial<Row> = {}): Row => ({
  oracleId: "o1", name: "Sol Ring", typeLine: "Artifact", cardTypeGroup: "Artifacts",
  role: "ramp" as const, owned: true, quantity: 1, auto: false,
  printedName: null, printedSetCode: null, printedCollectorNumber: null,
  cmc: 1, direction: "in" as const, from: 0, to: 1, bucket: "free" as const,
  shortfall: 0, ...over,
});

/** A card sleeved in one other deck. The flags are the guards `pullCandidate`
 *  reads: a mature, unpending, non-commander, senior claim is the releasable one. */
const claimed = (over: Partial<Availability["claims"][number]> = {}): Availability =>
  ({
    free: 0,
    claims: [
      {
        id: "holder",
        name: "Kykar",
        quantity: 1,
        mature: true,
        pending: false,
        commander: false,
        senior: true,
        ...over,
      },
    ],
  }) as unknown as Availability;

/** The pull's accessible name — the card and the deck it comes out of, not the
 *  two visible words, which repeat down the column. */
const PULL_NAME = deckVersioningCopy.review.pullA11y("Sol Ring", "Kykar");

describe("ReviewChanges", () => {
  it("groups both columns by card type and heads each with its count", () => {
    render(
      <ReviewChanges mix={TEST_MIX}
        deckId="d"
        deckName="Korvold"
        rows={{ in: [row()], out: [row({ oracleId: "o2", name: "Mox", direction: "out", from: 1, to: 0 })] }}
        {...SHAPE} state={STATE} cardCount={CARD_COUNT}
      />,
    );
    // Twice each, and one markup: the phone segment and the desktop direction
    // header carry the same string at the two widths.
    expect(screen.getAllByText(deckVersioningCopy.review.groupIn(1))).toHaveLength(2);
    expect(screen.getAllByText(deckVersioningCopy.review.groupOut(1))).toHaveLength(2);
    // The type is said once over the rows that share it, never per row — the
    // whole of what dropping the row's own label bought.
    expect(screen.getAllByText("Artifacts")).toHaveLength(2);
    expect(screen.queryByText("Artifact")).toBeNull();
  });

  it("files a quantity move as one row carrying from → to, never a bare name", () => {
    render(
      <ReviewChanges mix={TEST_MIX} deckId="d" deckName="Korvold" rows={{ in: [row({ from: 1, to: 2 })], out: [] }} {...SHAPE} state={STATE} cardCount={CARD_COUNT} />,
    );
    expect(screen.getByText(/1 → 2/)).toBeTruthy();
  });

  // A whole add and a whole cut are what the column heading already says, so a
  // `0 → 1` beside them would restate the column the row is standing in.
  it("says nothing about copies on a card arriving or leaving whole", () => {
    render(<ReviewChanges mix={TEST_MIX} deckId="d" deckName="Korvold" rows={{ in: [row()], out: [] }} {...SHAPE} state={STATE} cardCount={CARD_COUNT} />);
    expect(screen.queryByText(/\d+ → \d+/)).toBeNull();
  });

  it("puts the availability word in the accessible name, not only in colour", () => {
    render(
      <ReviewChanges mix={TEST_MIX}
        deckId="d"
        deckName="Korvold"
        rows={{ in: [row({ bucket: "unowned" })], out: [] }}
        {...SHAPE} state={STATE} cardCount={CARD_COUNT}
      />,
    );
    const describedBy = screen
      .getByRole("button", { name: /Sol Ring/ })
      .getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy as string)?.textContent).toBe(
      deckVersioningCopy.review.chipBuy,
    );
  });

  // A free copy is drawn as nothing — the availability marker returns null at
  // `free` on every surface in the app — so there is no colour for a word to be
  // the alternative to.
  it("describes nothing on a row the player already has a free copy of", () => {
    render(<ReviewChanges mix={TEST_MIX} deckId="d" deckName="Korvold" rows={{ in: [row()], out: [] }} {...SHAPE} state={STATE} cardCount={CARD_COUNT} />);
    expect(
      screen.getByRole("button", { name: /Sol Ring/ }).getAttribute("aria-describedby"),
    ).toBeNull();
  });

  // The figure is COPIES, not rows: one card going from three copies to one puts
  // two back in the pool, and the same note sits beside a buy count of copies.
  it("states the out column's rule once, in copies, and offers no per-row toggle", () => {
    render(
      <ReviewChanges mix={TEST_MIX}
        deckId="d"
        deckName="Korvold"
        rows={{ in: [], out: [row({ direction: "out", from: 3, to: 1 })] }}
        {...SHAPE}
        state={{ ...STATE, removes: [{ oracleId: "o1", from: 3, to: 1 }] }}
        cardCount={CARD_COUNT}
      />,
    );
    expect(screen.getByText(deckVersioningCopy.review.outNote(2))).toBeTruthy();
    expect(screen.queryByText(deckVersioningCopy.review.outNote(1))).toBeNull();
    expect(screen.queryByRole("button", { name: /Keep/ })).toBeNull();
  });

  // The lede names the version the player is about to cut, not the one they are
  // standing on: the whole page exists to be read before that number exists.
  it("heads the page with the version behind it and the version ahead", () => {
    render(<ReviewChanges mix={TEST_MIX} deckId="d" deckName="Korvold" rows={{ in: [row()], out: [] }} {...SHAPE} state={STATE} cardCount={CARD_COUNT} />);
    expect(screen.getByText(deckVersioningCopy.review.heading(1, 1))).toBeTruthy();
    expect(screen.getByText(deckVersioningCopy.review.lede(2))).toBeTruthy();
  });

  // The offer belongs to the adds: a pull answers "where does this copy come
  // from", and a card leaving the deck is not being sought for it.
  it("offers a pull on a sleeved add and on no removal", () => {
    render(
      <ReviewChanges mix={TEST_MIX}
        deckId="d"
        deckName="Korvold"
        rows={{
          in: [row({ bucket: "claimed", availability: claimed() })],
          out: [
            row({
              oracleId: "o2", name: "Mox", direction: "out", from: 1, to: 0,
              bucket: "claimed", availability: claimed(),
            }),
          ],
        }}
        {...SHAPE} state={STATE} cardCount={CARD_COUNT}
      />,
    );
    expect(screen.getAllByRole("button", { name: PULL_NAME })).toHaveLength(1);
  });

  // A card nobody has sleeved has no holder to pull from, and a free copy needs
  // nothing pulled — in both cases the buy tag or nothing is the whole row.
  it("offers no pull on a row with no sleeved holder", () => {
    render(
      <ReviewChanges mix={TEST_MIX}
        deckId="d"
        deckName="Korvold"
        rows={{ in: [row(), row({ oracleId: "o2", name: "Mox", bucket: "unowned" })], out: [] }}
        {...SHAPE} state={STATE} cardCount={CARD_COUNT}
      />,
    );
    expect(screen.queryByRole("button", { name: PULL_NAME })).toBeNull();
  });

  // `bucketAdds` calls an add free the moment the collection has a spare copy
  // for it, whatever else is holding one — so a free row arrives with live
  // claims on it, and an offer to raid another deck for a copy already in the
  // box is one `pullableCount` has never counted. The holder goes with it: the
  // row draws no availability marker at `free` either, and naming a deck the
  // reader is being offered nothing from is a fact about somebody else's box.
  it("offers no pull on a free add another deck also holds", () => {
    render(
      <ReviewChanges mix={TEST_MIX}
        deckId="d"
        deckName="Korvold"
        rows={{
          in: [
            row({
              bucket: "free",
              // A spare copy in the collection AND a copy sleeved elsewhere,
              // which is the pair the bucket is indifferent to.
              availability: { ...claimed(), free: 1 } as unknown as Availability,
            }),
          ],
          out: [],
        }}
        {...SHAPE}
        state={{ ...STATE, pullableCount: 0 }}
        cardCount={CARD_COUNT}
      />,
    );
    expect(screen.queryByRole("button", { name: PULL_NAME })).toBeNull();
    expect(screen.queryByText(deckVersioningCopy.review.heldBy("Kykar"))).toBeNull();
    expect(
      screen
        .getByRole("button", { name: cardDetailCopy.triggerAria("Sol Ring") })
        .getAttribute("aria-describedby"),
    ).toBeNull();
  });

  // The pending guard draws a tag and no control, because committing that deck's
  // half-finished draft from here would sweep in changes its owner never asked
  // for. The sentence explaining that is the ROW's description now that the
  // `Open →` link which used to carry it is gone. "can be pulled" is dropped
  // with the offer: it is the opposite of what this row is.
  it("describes a pending holder's guard on the row, and offers no control", () => {
    render(
      <ReviewChanges mix={TEST_MIX}
        deckId="d"
        deckName="Korvold"
        rows={{ in: [row({ bucket: "claimed", availability: claimed({ pending: true }) })], out: [] }}
        {...SHAPE}
        state={STATE} cardCount={CARD_COUNT}
      />,
    );
    const guard = deckVersioningCopy.review.pullGuardA11y("Kykar", "Sol Ring");
    expect(screen.queryByRole("button", { name: PULL_NAME })).toBeNull();
    // The page's own back link stays; what is gone is any way out of the ROW.
    expect(screen.queryByRole("link", { name: guard })).toBeNull();
    expect(
      screen.queryAllByRole("link").filter((a) => a.getAttribute("href") === "/decks/holder"),
    ).toHaveLength(0);
    const describedBy = screen
      .getByRole("button", { name: cardDetailCopy.triggerAria("Sol Ring") })
      .getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy as string)?.textContent).toBe(guard);
    expect(screen.queryByText(deckVersioningCopy.review.chipPullable)).toBeNull();
  });

  // The guards are the server's, so the row says which obstacle it hit rather
  // than drawing a control that can only fail. `pull-control.test.tsx` covers
  // both arms; this is the wiring — the row reads the claim's flags at all.
  it("draws the guard rather than the offer on a commander's copy", () => {
    render(
      <ReviewChanges mix={TEST_MIX}
        deckId="d"
        deckName="Korvold"
        rows={{ in: [row({ bucket: "claimed", availability: claimed({ commander: true }) })], out: [] }}
        {...SHAPE} state={STATE} cardCount={CARD_COUNT}
      />,
    );
    expect(screen.queryByRole("button", { name: PULL_NAME })).toBeNull();
    expect(screen.getByText(deckVersioningCopy.review.commanderGuardTag)).toBeTruthy();
  });

  // Said once per row, and by the row: the guard tag has no accessible name of
  // its own, so the sentence reaches a screen reader through the name trigger's
  // description — the only focusable thing on this arm — rather than twice.
  it("speaks the commander guard once, from the row's description", () => {
    render(
      <ReviewChanges mix={TEST_MIX}
        deckId="d"
        deckName="Korvold"
        rows={{ in: [row({ bucket: "claimed", availability: claimed({ commander: true }) })], out: [] }}
        {...SHAPE} state={STATE} cardCount={CARD_COUNT}
      />,
    );
    const sentence = deckVersioningCopy.review.commanderGuardA11y("Kykar", "Sol Ring");
    expect(screen.getAllByText(sentence)).toHaveLength(1);
    expect(screen.queryByLabelText(sentence)).toBeNull();
    expect(
      screen.getByRole("button", { name: cardDetailCopy.triggerAria("Sol Ring") }),
    ).toHaveAccessibleDescription(sentence);
  });

  // The word behind the colour is the row's own state. "can be pulled" on a row
  // whose control is refusing to offer one describes an act the page will not do.
  it("describes a commander's copy with the guard rather than the pull", () => {
    render(
      <ReviewChanges mix={TEST_MIX}
        deckId="d"
        deckName="Korvold"
        rows={{ in: [row({ bucket: "claimed", availability: claimed({ commander: true }) })], out: [] }}
        {...SHAPE} state={STATE} cardCount={CARD_COUNT}
      />,
    );
    const describedBy = screen
      .getByRole("button", { name: cardDetailCopy.triggerAria("Sol Ring") })
      .getAttribute("aria-describedby");
    expect(document.getElementById(describedBy as string)?.textContent).toBe(
      deckVersioningCopy.review.commanderGuardA11y("Kykar", "Sol Ring"),
    );
    expect(screen.queryByText(deckVersioningCopy.review.chipPullable)).toBeNull();
  });

  // L2: a copy locked in the holding deck draws the locked guard, and the row's description says
  // why, as the commander guard's does.
  it("draws the locked guard on a copy locked in its deck, and says why from the row", () => {
    render(
      <ReviewChanges mix={TEST_MIX}
        deckId="d"
        deckName="Korvold"
        rows={{ in: [row({ bucket: "claimed", availability: claimed({ locked: true }) })], out: [] }}
        {...SHAPE} state={STATE} cardCount={CARD_COUNT}
      />,
    );
    expect(screen.queryByRole("button", { name: PULL_NAME })).toBeNull();
    expect(screen.getByText(lockedCardsCopy.pull.tag)).toBeTruthy();
    expect(
      screen.getByRole("button", { name: cardDetailCopy.triggerAria("Sol Ring") }),
    ).toHaveAccessibleDescription(lockedCardsCopy.pull.a11y("Kykar", "Sol Ring"));
  });

  // Every other figure on the page stands down when the claim read failed — the
  // chips, the breakdown and the banner one click back all quote no purchase — so
  // a row still printing its figure would be the one thing pricing a commit
  // nobody could cost. The tag keeps the word `buy`, which is the collection's
  // answer and not the claim model's.
  it("quotes no price on a row when the claim read failed", () => {
    render(
      <ReviewChanges mix={TEST_MIX}
        deckId="d"
        deckName="Korvold"
        rows={{
          in: [row({
            owned: false, bucket: null,
            price: { cents: 2840, foilCents: null, etchedCents: null, asOf: new Date("2026-09-08") },
          })],
          out: [],
        }}
        {...SHAPE} state={{ ...STATE, claimsKnown: false, newestAsOf: new Date("2026-09-08") }}
        cardCount={CARD_COUNT}
      />,
    );
    expect(screen.getByText(addPanelCopy.unowned.tag)).toBeTruthy();
    expect(screen.queryByText("$28.40")).toBeNull();
  });

  // `bucketAdds` files a partially covered add with no claimant under `unowned`,
  // so the row is a card the player owns a copy of AND a purchase of the rest.
  // Deciding the slot on `owned` drew the availability marker there and hid the
  // price on a row this page's own buy count includes.
  it("prices an add the player owns a copy of but must still buy copies for", () => {
    render(
      <ReviewChanges mix={TEST_MIX}
        deckId="d"
        deckName="Korvold"
        rows={{
          in: [row({
            owned: true, from: 1, to: 4, bucket: "unowned", shortfall: 3,
            price: { cents: 2840, foilCents: null, etchedCents: null, asOf: new Date("2026-09-08") },
          })],
          out: [],
        }}
        {...SHAPE}
        state={{ ...STATE, newestAsOf: new Date("2026-09-08") }}
        cardCount={CARD_COUNT}
      />,
    );
    expect(screen.getByText("$28.40")).toBeTruthy();
  });

  // The bar's own figure, and the sheet one click down counts the same one: both
  // are copies, because the buy term beside them is.
  it("counts the bar's released figure in copies", () => {
    render(
      <ReviewChanges mix={TEST_MIX}
        deckId="d"
        deckName="Korvold"
        rows={{ in: [], out: [row({ direction: "out", from: 3, to: 1 })] }}
        {...SHAPE}
        state={{ ...STATE, removes: [{ oracleId: "o1", from: 3, to: 1 }] }}
        cardCount={CARD_COUNT}
      />,
    );
    expect(
      screen.getByText(deckVersioningCopy.review.footer(CARD_COUNT, STATE.buyCount, 2)),
    ).toBeTruthy();
  });

  // Grouped order, not the payload's: the columns group by type and sort inside a
  // group, so paging the payload's own order steps the reader somewhere other
  // than the row under the one they opened.
  it("pages the card modal in the order the columns draw", async () => {
    getCardDetail.mockImplementation(async (oracleId: string) =>
      browseCard(oracleId, oracleId === "o1" ? "Sol Ring" : oracleId === "o2" ? "Llanowar Elves" : "Mox"),
    );
    render(
      <ReviewChanges mix={TEST_MIX}
        deckId="d"
        deckName="Korvold"
        rows={{
          in: [
            row(),
            row({ oracleId: "o2", name: "Llanowar Elves", typeLine: "Creature", cardTypeGroup: "Creatures" }),
            row({ oracleId: "o3", name: "Mox" }),
          ],
          out: [],
        }}
        {...SHAPE} state={STATE} cardCount={CARD_COUNT}
      />,
    );
    // Drawn as Llanowar Elves (Creatures), then Mox and Sol Ring (Artifacts, by
    // name) — so Sol Ring is the third of three here and the first of three in
    // the payload.
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: cardDetailCopy.triggerAria("Sol Ring") }));
    });
    await waitFor(() => {
      expect(screen.getByText("3 of 3")).toBeTruthy();
    });
  });

  // One column is nothing to switch between, so the phone control is absent —
  // and its absence is what keeps the desktop columns from being drawn twice.
  it("offers the phone segments only when both columns have rows", () => {
    // The segment is labelled by the column heading itself, figure and all, so
    // the page has one name for a direction rather than a chip's and a
    // heading's.
    const segment = deckVersioningCopy.review.groupIn(1);
    const { unmount } = render(
      <ReviewChanges mix={TEST_MIX} deckId="d" deckName="Korvold" rows={{ in: [row()], out: [] }} {...SHAPE} state={STATE} cardCount={CARD_COUNT} />,
    );
    expect(screen.queryByRole("button", { name: segment })).toBeNull();
    unmount();
    render(
      <ReviewChanges mix={TEST_MIX}
        deckId="d"
        deckName="Korvold"
        rows={{ in: [row()], out: [row({ oracleId: "o2", name: "Mox", direction: "out", from: 1, to: 0 })] }}
        {...SHAPE} state={STATE} cardCount={CARD_COUNT}
      />,
    );
    expect(screen.getByRole("button", { name: segment })).toBeTruthy();
  });

  // The one way off this page that is neither a commit nor a discard, and it
  // names the deck: a bare "Back" would ask the reader to remember which deck
  // they were editing to know where it goes.
  it("links back to the deck by name", () => {
    render(
      <ReviewChanges mix={TEST_MIX} deckId="d7" deckName="Korvold" rows={{ in: [row()], out: [] }} {...SHAPE} state={STATE} cardCount={CARD_COUNT} />,
    );
    const back = screen.getByRole("link", { name: /Korvold/ });
    expect(back.getAttribute("href")).toBe("/decks/d7");
  });

  // Every chip is counted off the state rather than off the rows beside it — the
  // banner, this strip and the commit sheet's buy block are one purchase with
  // three appearances — and the purchase rides on the to-buy chip because a
  // count of copies and what those copies cost are one fact.
  it("chips the purchase with its total, and draws no chip for a nought", () => {
    render(
      <ReviewChanges mix={TEST_MIX}
        deckId="d"
        deckName="Korvold"
        rows={{ in: [row()], out: [] }}
        {...SHAPE} state={{ ...STATE, buyCount: 3, total: "$28.40", pullableCount: 0 }}
        cardCount={CARD_COUNT}
      />,
    );
    expect(screen.getByText(deckVersioningCopy.review.chipBuy)).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("$28.40")).toBeTruthy();
    // No pull is on the table, so the chip standing for one is absent rather
    // than drawn at zero.
    expect(screen.queryByText(deckVersioningCopy.review.chipPullable)).toBeNull();
    // Nor is the out chip, with no column behind it.
    expect(screen.queryByText(deckVersioningCopy.review.chipOut)).toBeNull();
  });

  // The pair goes inside the row the card is already named on. A caption under
  // the row printed the name a second time, which is the one thing the row it
  // hangs off has never failed to say.
  it("carries the recount inside the row without naming the card twice", () => {
    render(
      <ReviewChanges mix={TEST_MIX}
        deckId="d"
        deckName="Korvold"
        rows={{ in: [row({ from: 3, to: 1 })], out: [] }}
        {...SHAPE} state={STATE} cardCount={CARD_COUNT}
      />,
    );
    expect(screen.getByText(/3 → 1/)).toBeTruthy();
    expect(screen.queryByText(/Sol Ring 3 → 1/)).toBeNull();
  });

  // Desktop only: at 390px the segmented pair is the direction, and the lede
  // describes pulls the reader can see on the list below it.
  it("heads each column with its direction and its breakdown", () => {
    render(
      <ReviewChanges mix={TEST_MIX}
        deckId="d"
        deckName="Korvold"
        rows={{ in: [row()], out: [] }}
        {...SHAPE} state={STATE} cardCount={CARD_COUNT}
      />,
    );
    expect(
      screen.getByText(deckVersioningCopy.review.groupInBreakdown(0, 0, 0)),
    ).toBeTruthy();
  });

  // The bar is a bar and not a lone button: the figures it carries are what a
  // reader checks before the irreversible click, and they are the same three the
  // sheet one click down repeats.
  it("foots the page with the commit and the figures it would freeze", () => {
    render(
      <ReviewChanges mix={TEST_MIX}
        deckId="d"
        deckName="Korvold"
        rows={{ in: [row()], out: [] }}
        {...SHAPE} state={{ ...STATE, buyCount: 3 }}
        cardCount={CARD_COUNT}
      />,
    );
    const note = screen.getByText(
      deckVersioningCopy.review.footer(CARD_COUNT, 3, STATE.removes.length),
    );
    const cta = screen.getByRole("button", {
      name: deckVersioningCopy.pending.commitCta((STATE.version?.number ?? 0) + 1),
    });
    const bar = note.parentElement as HTMLElement;
    expect(bar.contains(cta)).toBe(true);
    expect(bar.className).toContain("[border-top:1px_solid_var(--border-strong)]");
    expect(bar.className).toContain("bg-[color:var(--bg)]");
    // One element ordered twice rather than two subtrees: the note reads first on
    // the phone and last above it, and the DOM holds it once either way.
    expect(note.className).toContain("order-first md:order-last");
    // Three items in the bar, and the third is Discard. It shares the phone's
    // button row with the commit — one wrapper, which dissolves above the
    // breakpoint so all three sit on one line.
    const discard = screen.getByRole("button", {
      name: deckVersioningCopy.pending.discardCta,
    });
    expect(bar.contains(discard)).toBe(true);
    const buttonRow = discard.parentElement as HTMLElement;
    expect(buttonRow.contains(cta)).toBe(true);
    expect(buttonRow.className).toContain("md:contents");
  });

  // The question replaces the bar's own body, exactly as it replaces the banner's
  // card on the deck page: the figures the commit would freeze have no business
  // being drawn under a question about throwing the draft away.
  it("puts the discard confirm in the bar, in place of its controls", () => {
    render(
      <ReviewChanges mix={TEST_MIX}
        deckId="d"
        deckName="Korvold"
        rows={{ in: [row()], out: [] }}
        {...SHAPE}
        state={STATE}
        cardCount={CARD_COUNT}
      />,
    );
    act(() => {
      screen.getByRole("button", { name: deckVersioningCopy.pending.discardCta }).click();
    });
    const question = screen.getByText(
      deckVersioningCopy.discard.question(STATE.addChanges.length + STATE.removes.length),
    );
    const bar = question.closest("div")?.parentElement as HTMLElement;
    expect(bar.className).toContain("[border-top:1px_solid_var(--border-strong)]");
    // No second wording for this door, and no figures beside the question.
    expect(
      screen.queryByText(
        deckVersioningCopy.review.footer(CARD_COUNT, STATE.buyCount, STATE.removes.length),
      ),
    ).toBeNull();
    expect(
      screen.queryByRole("button", {
        name: deckVersioningCopy.pending.commitCta((STATE.version?.number ?? 0) + 1),
      }),
    ).toBeNull();
  });

  // The two deck-page CTAs that mean "commit this" link here with `?commit=1`,
  // and the page is the commit surface — arriving that way and being shown a
  // button that opens what you asked for is one click too many.
  it("mounts the commit sheet at the foot, open when the reader asked for it", () => {
    const commitCta = deckVersioningCopy.pending.commitCta(
      (STATE.version?.number ?? 0) + 1,
    );
    render(
      <ReviewChanges mix={TEST_MIX}
        deckId="d"
        deckName="Korvold"
        rows={{ in: [row()], out: [] }}
        {...SHAPE} state={STATE}
        cardCount={CARD_COUNT}
      />,
    );
    // Folded by default: the reader came to read the columns, and the sheet is
    // one click under them.
    expect(screen.getByRole("button", { name: commitCta })).toBeTruthy();
    expect(screen.queryByLabelText(deckVersioningCopy.commit.noteLabel)).toBeNull();

    cleanup();
    render(
      <ReviewChanges mix={TEST_MIX}
        deckId="d"
        deckName="Korvold"
        rows={{ in: [row()], out: [] }}
        {...SHAPE} state={STATE}
        cardCount={CARD_COUNT}
        commitOpen
      />,
    );
    // Expanded, and the sheet's own figure is the count it was handed rather
    // than a tally of the one row above it.
    expect(screen.queryByRole("button", { name: commitCta })).toBeNull();
    expect(screen.getByLabelText(deckVersioningCopy.commit.noteLabel)).toBeTruthy();
    expect(
      screen.getByText(
        deckVersioningCopy.commit.footer(CARD_COUNT, STATE.buyCount, STATE.removes.length),
      ),
    ).toBeTruthy();
  });

  // `?commit=1` is an instruction to open the sheet, so cancelling has to take it
  // off the URL as well as close the sheet. Left behind, a reload or a
  // back-forward return hands the reader back the sheet they just dismissed.
  it("takes ?commit=1 off the URL when the sheet is cancelled", () => {
    history.replaceState(null, "", "/decks/d/changes?commit=1&filter=shopping");
    render(
      <ReviewChanges mix={TEST_MIX}
        deckId="d"
        deckName="Korvold"
        rows={{ in: [row()], out: [] }}
        {...SHAPE}
        state={STATE}
        cardCount={CARD_COUNT}
        commitOpen
      />,
    );
    act(() => {
      screen.getByRole("button", { name: deckVersioningCopy.commit.cancel }).click();
    });
    expect(screen.queryByLabelText(deckVersioningCopy.commit.noteLabel)).toBeNull();
    expect(window.location.search).toBe("?filter=shopping");
  });
  // A versionless deck has no predecessor to diff against, so `loadDraftState`
  // gives it no change lists at all. Read through the committed copy this page
  // would head itself "0 changes since v1" over a lede about what a draft costs —
  // both false of a list that IS v1. The route admits a brew only when it can cut
  // v1, so this pair is the whole page.
  it("names the act rather than a diff on a deck with no version yet", () => {
    render(
      <ReviewChanges mix={TEST_MIX}
        deckId="d"
        deckName="Korvold"
        rows={{ in: [], out: [] }}
        {...SHAPE}
        state={BREW}
        cardCount={CARD_COUNT}
      />,
    );
    expect(
      screen.getByRole("heading", { name: deckVersioningCopy.review.firstHeading(CARD_COUNT) }),
    ).toBeTruthy();
    expect(screen.getByText(deckVersioningCopy.review.firstLede)).toBeTruthy();
    expect(screen.queryByText(deckVersioningCopy.review.heading(0, 1))).toBeNull();
  });

  // Nothing moved at all: not a state the route admits, and there is one
  // heading left to draw. The basics-only heading it used to borrow here is
  // retired — basics are rows, so a draft that moved them counts them.
  it("keeps the diff heading when a clean draft is rendered anyway", () => {
    render(
      <ReviewChanges mix={TEST_MIX}
        deckId="d"
        deckName="Korvold"
        rows={{ in: [], out: [] }}
        {...SHAPE}
        state={STATE}
        cardCount={CARD_COUNT}
      />,
    );
    expect(screen.getByRole("heading", { name: deckVersioningCopy.review.heading(0, 1) })).toBeTruthy();
  });

  // A failed claim read leaves every add's bucket null, so all three terms of the
  // breakdown come back at nought. Printed as themselves they read "nothing to
  // buy" — the one thing the page must not say about a read it could not make.
  it("says the claims were unreadable rather than printing three noughts", () => {
    render(
      <ReviewChanges mix={TEST_MIX}
        deckId="d"
        deckName="Korvold"
        rows={{ in: [row({ bucket: null })], out: [] }}
        {...SHAPE}
        state={{ ...STATE, claimsKnown: false }}
        cardCount={CARD_COUNT}
      />,
    );
    expect(screen.getByText(deckVersioningCopy.review.groupInUnknown)).toBeTruthy();
    expect(
      screen.queryByText(deckVersioningCopy.review.groupInBreakdown(0, 0, 0)),
    ).toBeNull();
  });

  // The same false zero in the bar: `buyCount` is 0 both when there is nothing to
  // buy and when the claims could not be read, and only the first is a fact.
  it("drops the footer's purchase term when the claims could not be read", () => {
    render(
      <ReviewChanges mix={TEST_MIX}
        deckId="d"
        deckName="Korvold"
        rows={{ in: [row({ bucket: null })], out: [] }}
        {...SHAPE}
        state={{ ...STATE, claimsKnown: false }}
        cardCount={CARD_COUNT}
      />,
    );
    expect(
      screen.getByText(
        deckVersioningCopy.review.footerUnknown(CARD_COUNT, STATE.removes.length),
      ),
    ).toBeTruthy();
    expect(
      screen.queryByText(deckVersioningCopy.review.footer(CARD_COUNT, 0, STATE.removes.length)),
    ).toBeNull();
  });

  // Two short type groups used to share a line as ~276px sub-columns, which saved
  // a heading's height and charged every row on those lines the width its own
  // contents need — a name, a cost track and a `Put back` do not fit across 276px,
  // so the control wrapped under the name and the two halves of one column
  // disagreed about what a row looks like. Every group takes the column's full
  // width now (Hugh's ruling of 2026-09-14).
  //
  // Structure rather than geometry, because jsdom lays nothing out: what the
  // pairing WAS is a wrapper element between the section and the groups, so its
  // absence is the whole of the assertion — each group's box is a direct child of
  // the column, and no `md:flex-row` line survives.
  it("gives every type group the column's own width", () => {
    render(
      <ReviewChanges mix={TEST_MIX}
        deckId="d"
        deckName="Korvold"
        rows={{
          in: [],
          out: [
            row({ oracleId: "o1", name: "Mox", direction: "out", from: 1, to: 0,
              typeLine: "Artifact", cardTypeGroup: "Artifacts" }),
            row({ oracleId: "o2", name: "Heartless Act", direction: "out", from: 1, to: 0,
              typeLine: "Instant", cardTypeGroup: "Instants" }),
          ],
        }}
        {...SHAPE}
        state={STATE}
        cardCount={CARD_COUNT}
      />,
    );
    const groups = ["Artifacts", "Instants"].map((label) => {
      const heading = screen.getByRole("heading", { name: new RegExp(`^${label}`) });
      return heading.closest("div.mb-\\[16px\\]") as HTMLElement;
    });
    expect(groups.every(Boolean)).toBe(true);
    // One list between them, each group sitting directly in it, and the list the
    // section's second subgrid row (the header is the first).
    const list = groups[0].parentElement as HTMLElement;
    expect(groups[1].parentElement).toBe(list);
    const section = list.parentElement as HTMLElement;
    expect(section.tagName).toBe("SECTION");
    expect(section.children[1]).toBe(list);
    expect(section.querySelector(".md\\:flex-row")).toBeNull();
  });

  // The heading hides on the phone only because the segmented pair above it is
  // already naming the direction. A lone column has no pair, so hiding it there
  // leaves the phone an unlabelled list of cards with no way to tell which way
  // they are going.
  it("keeps the lone column's heading on the phone, and drops it beside a pair", () => {
    const headingOf = () =>
      screen.getByRole("heading", { name: deckVersioningCopy.review.groupIn(1) })
        .parentElement as HTMLElement;
    const { unmount } = render(
      <ReviewChanges mix={TEST_MIX} deckId="d" deckName="Korvold" rows={{ in: [row()], out: [] }} {...SHAPE} state={STATE} cardCount={CARD_COUNT} />,
    );
    expect(headingOf().className).not.toContain("hidden");
    unmount();
    render(
      <ReviewChanges mix={TEST_MIX}
        deckId="d"
        deckName="Korvold"
        rows={{ in: [row()], out: [row({ oracleId: "o2", name: "Mox", direction: "out", from: 1, to: 0 })] }}
        {...SHAPE}
        state={STATE} cardCount={CARD_COUNT}
      />,
    );
    expect(headingOf().className).toContain("hidden");
  });

  // ── Putting a cut card back ────────────────────────────────────────────────
  //
  // The one write this column has. It always succeeds — a restore is an add,
  // and adds never refuse on claims — so what is asserted is where the row goes
  // and which figures follow it, not a guard.
  describe("Put back", () => {
    const cut = (over: Partial<Row> = {}) =>
      row({ oracleId: "o2", name: "Mox Diamond", direction: "out", from: 1, to: 0, ...over });
    const putBack = (name = "Mox Diamond") =>
      screen.getByRole("button", { name: deckVersioningCopy.restore.ctaA11y(name) });

    /** A transition does not re-render until it settles, and `findByText`'s own
     *  polling will not advance one. Everything after a tap waits on this. */
    const settle = () => act(async () => { await Promise.resolve(); });

    /** Holds the write open so the optimistic paint can be read, then lets it
     *  finish. A promise left unsettled keeps its transition pending for the
     *  rest of the file, and every test after it stops re-rendering. */
    function hold() {
      // Every resolver, not the last one. Nothing here starts two adds any more —
      // the latch ignores the second press — but a held write that is never
      // resolved keeps its transition pending for the rest of the FILE, so the
      // release collects whatever was actually issued rather than assuming one.
      const answers: Array<(r: { ok: boolean }) => void> = [];
      addCardToDeck.mockImplementation(
        () => new Promise((resolve) => { answers.push(resolve); }),
      );
      return {
        release: () => act(async () => {
          for (const answer of answers) answer({ ok: true });
        }),
      };
    }

    // `mockResolvedValue` does not clear a `mockImplementation`, so a held write
    // would otherwise hang every test after it.
    beforeEach(() => {
      addCardToDeck.mockReset();
      addCardToDeck.mockResolvedValue({ ok: true });
      commitDeckVersion.mockReset();
      commitDeckVersion.mockResolvedValue({ ok: true, number: 2, cardCount: CARD_COUNT, buy: [], pull: [] });
      discardDeckDraft.mockReset();
      discardDeckDraft.mockResolvedValue({ ok: true });
      // Or an assertion that the catch re-reads the route passes on the refresh
      // a previous test's success already made.
      refresh.mockClear();
    });

    function mount(rows: { in: Row[]; out: Row[] }) {
      return render(
        <ReviewChanges mix={TEST_MIX}
          deckId="d" deckName="Korvold" rows={rows}
          {...SHAPE} state={STATE} cardCount={CARD_COUNT}
        />,
      );
    }

    it("offers it on every row going out, and on none coming in", () => {
      mount({ in: [row()], out: [cut()] });
      expect(putBack()).toBeInTheDocument();
      // The reverse of an add is a removal, and the deck page does that.
      expect(
        screen.queryByRole("button", { name: deckVersioningCopy.restore.ctaA11y("Sol Ring") }),
      ).toBeNull();
    });

    // A put-back is `addCardToDeck` unwrapped — ONE copy — while the optimistic
    // model beside it retires the whole row and credits `from - to`. The two
    // agree on a single-copy cut and on nothing else, so a five-Swamp cut would
    // add one Swamp, hide the row, and tell the reader the deck grew by five.
    // Basics are the only rows that ever carried a count above one, so this was
    // unreachable until they were drawn.
    // The reported defect, on the surface it was reported against. A deck that
    // cut all five of its Swamps drew a bare `Swamp` under `Going out`, which is
    // what the heading says about a single copy — so five cards coming out of
    // the sleeve read as one.
    it("prints the pair on a whole cut of more than one copy", () => {
      mount({ in: [], out: [cut({ oracleId: "swamp", name: "Swamp", from: 5, to: 0 })] });
      // The figures are their own element beside the name, which is what lets a
      // long name truncate without taking the counts with it — so the assertion
      // is `recountedItem` with the name argument empty, the same way the row
      // builds it.
      expect(screen.getByText("Swamp")).toBeInTheDocument();
      expect(
        screen.getByText(deckImportCopy.update.diff.recountedItem("", "5", "0").trim()),
      ).toBeInTheDocument();
    });

    it("withholds it from a cut of more than one copy, and keeps it at one", () => {
      mount({ in: [], out: [
        cut({ oracleId: "swamp", name: "Swamp", from: 5, to: 0 }),
        cut({ oracleId: "forest", name: "Forest", from: 5, to: 4 }),
      ] });
      expect(
        screen.queryByRole("button", { name: deckVersioningCopy.restore.ctaA11y("Swamp") }),
      ).toBeNull();
      expect(putBack("Forest")).toBeInTheDocument();
    });

    it("takes the row out of the column on tap, before the server answers", async () => {
      const held = hold();
      mount({ in: [row()], out: [cut()] });
      await act(async () => {
        fireEvent.click(putBack());
      });
      // The row is gone with the write still in flight, which is the whole of
      // what optimistic means here.
      expect(screen.queryByText("Mox Diamond")).toBeNull();
      await held.release();
    });

    // Asserted with the write still in flight, which is the only window these
    // figures are the optimistic ones: `useOptimistic` drops its value when the
    // transition settles, and in the app the refreshed server list is what
    // replaces it. Here the props are static, so the row would come back.
    it("moves every figure the row was counted in", async () => {
      const held = hold();
      mount({ in: [], out: [cut(), cut({ oracleId: "o3", name: "Chrome Mox" })] });
      expect(screen.getAllByText(deckVersioningCopy.review.groupOut(2)).length).toBeGreaterThan(0);
      // The deck's own size, before the card comes back into it.
      expect(document.body.textContent).toContain(`${CARD_COUNT} cards`);

      await act(async () => {
        fireEvent.click(putBack());
      });

      expect(screen.getAllByText(deckVersioningCopy.review.groupOut(1)).length).toBeGreaterThan(0);
      // The card is in the deck again, so the deck is one bigger — in the same
      // paint the row left, not a round trip later.
      expect(document.body.textContent).toContain(`${CARD_COUNT + 1} cards`);
      await held.release();
    });

    // The copies going back into the collection on commit. A restore takes one
    // out of that number, because the card is staying in the deck after all.
    it("takes the restored copy out of the released figure", async () => {
      const held = hold();
      // A state whose removes agree with the rows, which the shared fixture's
      // empty lists do not: `releasedCopies` reads the state, the rows are this
      // render's, and only a state that holds the cut has a figure to move.
      const withRemoves = { ...STATE, removes: [{ oracleId: "o2", from: 1, to: 0 }] };
      render(
        <ReviewChanges mix={TEST_MIX}
          deckId="d" deckName="Korvold" rows={{ in: [], out: [cut()] }}
          {...SHAPE} state={withRemoves} cardCount={CARD_COUNT}
        />,
      );
      expect(document.body.textContent).toContain("1 back in the pool");

      await act(async () => {
        fireEvent.click(putBack());
      });

      expect(document.body.textContent).toContain("0 back in the pool");
      await held.release();
    });

    // Decision 6: a restored card is in neither list, so there is nothing to
    // buy and nothing that could move the money. A figure that moved would be
    // a bug rather than a lag, which is why this is asserted and not projected.
    it("moves no money figure", async () => {
      const held = hold();
      mount({ in: [], out: [cut()] });
      const buy = document.body.textContent?.match(/\d+ to buy/)?.[0] ?? null;
      await act(async () => {
        fireEvent.click(putBack());
      });
      expect(document.body.textContent?.match(/\d+ to buy/)?.[0] ?? null).toBe(buy);
      await held.release();
    });

    it("returns the row and says so when the write refuses", async () => {
      addCardToDeck.mockImplementation(async () => ({ ok: false, message: "nope" }));
      mount({ in: [], out: [cut()] });
      await act(async () => {
        fireEvent.click(putBack());
      });
      await settle();
      await screen.findByText("nope");
      // The row came back with it — a refusal is not a removal.
      expect(screen.getByText("Mox Diamond")).toBeInTheDocument();
    });

    it("says the restore failed when the write throws, not that the card is in the deck", async () => {
      addCardToDeck.mockImplementation(async () => {
        throw new Error("network");
      });
      mount({ in: [], out: [cut()] });
      await act(async () => {
        fireEvent.click(putBack());
      });
      await settle();
      await screen.findByText(deckVersioningCopy.restore.failed);
    });

    // Focus lands on the heading of the group the row left — never on the next
    // row's control, which would put a live restore under a finger that has
    // just used one.
    it("puts focus on the group heading the row left", async () => {
      mount({ in: [], out: [cut(), cut({ oracleId: "o3", name: "Chrome Mox" })] });
      await act(async () => {
        fireEvent.click(putBack());
      });
      await settle();
      // After the server confirms, not before: the landing place is the answer
      // to a write that happened. The heading is the only thing in the column
      // carrying a tabindex, so it is the only element focus could have taken.
      expect(document.activeElement?.getAttribute("tabindex")).toBe("-1");
      expect(document.activeElement?.textContent).toContain("Artifacts");
    });

    // The phone's segmented pair reads the same counts the columns do. Without
    // that, restoring the last cut while standing on the Out segment leaves a
    // stale tab selected over a hidden `Coming in` list.
    it("stands the reader back on Coming in when the last cut goes", async () => {
      const held = hold();
      mount({ in: [row()], out: [cut()] });
      const outTab = screen.getByRole("button", { name: deckVersioningCopy.review.groupOut(1) });
      await act(async () => {
        fireEvent.click(outTab);
      });
      expect(outTab).toHaveAttribute("aria-pressed", "true");

      await act(async () => {
        fireEvent.click(putBack());
      });

      // The pair is gone with the column, and the add is what is on screen.
      expect(
        screen.queryByRole("button", { name: deckVersioningCopy.review.groupOut(1) }),
      ).toBeNull();
      expect(screen.getByText("Sol Ring")).toBeInTheDocument();
      // And the restored card is in NEITHER list: appending it to `Coming in`
      // would satisfy the assertion above while breaking the contract.
      expect(screen.queryByText("Mox Diamond")).toBeNull();
      await held.release();
    });

    // The sheet computes its own released figure from `state.removes`, so an
    // open sheet would keep quoting a release the reader has just undone.
    it("moves the released figure inside an open commit sheet", async () => {
      const held = hold();
      const withRemoves = { ...STATE, removes: [{ oracleId: "o2", from: 1, to: 0 }] };
      render(
        <ReviewChanges mix={TEST_MIX}
          deckId="d" deckName="Korvold" rows={{ in: [], out: [cut()] }}
          {...SHAPE} state={withRemoves} cardCount={CARD_COUNT} commitOpen
        />,
      );
      // The sheet's own wording for the same figure.
      expect(document.body.textContent).toContain("1 released");

      await act(async () => {
        fireEvent.click(putBack());
      });

      expect(document.body.textContent).toContain("0 released");
      await held.release();
    });

    // Commit and discard serialize with this add on the deck lock. A commit
    // that wins the race freezes the cut the optimistic row has already taken
    // off the screen, and the restore then lands as a fresh draft on the far
    // side of the navigation.
    it("shuts the commit and discard doors while the write is in flight", async () => {
      const held = hold();
      mount({ in: [], out: [cut(), cut({ oracleId: "o3", name: "Chrome Mox" })] });
      const commit = screen.getByRole("button", {
        name: deckVersioningCopy.pending.commitCta(2),
      });
      expect(commit).toBeEnabled();

      const discard = screen.getByRole("button", {
        name: deckVersioningCopy.pending.discardCta,
      });
      expect(discard).toBeEnabled();

      await act(async () => {
        fireEvent.click(putBack());
      });
      expect(commit).toBeDisabled();
      // Both doors, not one: the discard guard could otherwise be deleted with
      // this test still green, and the race it exists for is the destructive
      // half.
      expect(discard).toBeDisabled();

      await held.release();
      expect(
        screen.getByRole("button", { name: deckVersioningCopy.pending.commitCta(2) }),
      ).toBeEnabled();
    });

    // A row that has optimistically left is not somewhere Prev/Next should be
    // able to page back to.
    it("drops the restored row out of the modal's sibling list", async () => {
      const held = hold();
      mount({ in: [], out: [cut(), cut({ oracleId: "o3", name: "Chrome Mox" })] });
      await act(async () => {
        fireEvent.click(putBack());
      });
      // The row is gone from the column, so the card behind it is gone from the
      // list the modal pages through.
      expect(screen.queryByText("Mox Diamond")).toBeNull();
      await held.release();
    });

    // A throw is an UNKNOWN outcome, not a failed one: a response lost after
    // the transaction committed looks identical from here. Without the re-read
    // the row would sit saying "still going out" over a card already back in
    // the deck.
    it("re-reads the route when the outcome is unknown", async () => {
      addCardToDeck.mockImplementation(async () => {
        throw new Error("network");
      });
      mount({ in: [], out: [cut()] });
      await act(async () => {
        fireEvent.click(putBack());
      });
      await settle();
      await screen.findByText(deckVersioningCopy.restore.failed);
      expect(refresh).toHaveBeenCalled();
    });

    // ONE write at a time, whoever owns it. Two taps inside one round trip used
    // to send two adds, and then each receipt described a column the other had
    // not left yet: whichever settled second had been told one more row was
    // going out than was still true, and said so out loud. The second press is
    // ignored instead — the control stays live, which R3 requires, and the row
    // is still there to press again once the first lands.
    it("files one write while another row's is in the air", async () => {
      const held = hold();
      mount({ in: [], out: [cut(), cut({ oracleId: "o3", name: "Chrome Mox" })] });
      await act(async () => {
        fireEvent.click(putBack());
      });
      await act(async () => {
        fireEvent.click(putBack("Chrome Mox"));
      });
      expect(addCardToDeck).toHaveBeenCalledTimes(1);
      // `relock` (L1): a card that left locked comes back locked.
      expect(addCardToDeck).toHaveBeenCalledWith("d", "o2", { relock: true });
      await held.release();
    });

    // The shape strip describes the DRAFT, so a restored card belongs in it.
    // With an empty shape the projection could be deleted and every other test
    // here would stay green.
    it("puts the restored card back into the shape the strip draws", async () => {
      const held = hold();
      const shape = {
        before: [{ role: "ramp" as const, quantity: 1, typeLine: "Artifact", cmc: 1 }],
        after: [] as typeof SHAPE.after,
        contested: [] as typeof SHAPE.contested,
      };
      render(
        <ReviewChanges mix={TEST_MIX}
          deckId="d" deckName="Korvold" rows={{ in: [], out: [cut(), cut({ oracleId: "o3", name: "Chrome Mox" })] }}
          {...shape} state={STATE} cardCount={CARD_COUNT}
        />,
      );
      // The draft holds none of that type before the restore, and one after.
      const ramp = () => document.body.textContent?.match(/Ramp\s*(\d+)→(\d+)/)?.[2];
      expect(ramp()).toBe("0");

      await act(async () => {
        fireEvent.click(putBack());
      });

      expect(ramp()).toBe("1");
      await held.release();
    });

    // The column goes with its last row, so the heading cannot receive focus —
    // and the page heading carries no tabindex of its own. Without a case that
    // empties the column, that whole branch could be deleted.
    it("puts focus on the page heading when the column itself goes", async () => {
      mount({ in: [row()], out: [cut()] });
      await act(async () => {
        fireEvent.click(putBack());
      });
      await settle();
      expect(document.activeElement?.tagName).toBe("H1");
    });

    // The controls stay enabled by design, so nothing stops a second click on
    // the SAME row before the transition re-renders — and a duplicate id would
    // have every projection counting that card twice.
    it("files one restore per row, however many times it is pressed", async () => {
      const held = hold();
      mount({ in: [], out: [cut(), cut({ oracleId: "o3", name: "Chrome Mox" })] });
      const control = putBack();
      await act(async () => {
        fireEvent.click(control);
        fireEvent.click(control);
      });
      // One write, and the deck grew by one card rather than two.
      expect(addCardToDeck).toHaveBeenCalledTimes(1);
      expect(document.body.textContent).toContain(`${CARD_COUNT + 1} cards`);
      await held.release();
    });

    // The receipt's figures, by value rather than by absence: a sentence that
    // merely avoided saying "nothing going out" would pass with the count off by
    // one, which is the defect this replaces. It pins the sentence rather than the
    // fix — with one write in the air the retired code computed the same string,
    // and what makes the figures trustworthy is the serialisation the case above
    // asserts.
    it("counts the receipt off what the write actually left behind", async () => {
      mount({ in: [row()], out: [cut(), cut({ oracleId: "o3", name: "Chrome Mox" })] });
      await act(async () => {
        fireEvent.click(putBack());
      });
      await settle();
      const spoken = document.getElementById("draft-announcer")?.textContent ?? "";
      expect(spoken).toBe(
        deckVersioningCopy.restore.announced("Mox Diamond", CARD_COUNT + 1, 1),
      );
    });

    // Change commander: a trade's only cut is the new commander leaving for the command zone, so
    // `Going out` says so instead of the pool sentence; beside an ordinary cut, the pool sentence stays.
    it("notes a trade's cut as moving to the command zone, and keeps the pool note beside another cut", () => {
      const trade = {
        from: { commanderOracleId: "korvold", partnerOracleId: null },
        to: { commanderOracleId: "o2", partnerOracleId: null },
      };
      const { unmount } = render(
        <ReviewChanges mix={TEST_MIX} deckId="d" deckName="Korvold" rows={{ in: [], out: [cut()] }}
          {...SHAPE} state={{ ...STATE, commander: trade }} cardCount={CARD_COUNT} />,
      );
      expect(screen.getByText("it moves to the command zone")).toBeTruthy();
      unmount();
      render(
        <ReviewChanges mix={TEST_MIX} deckId="d" deckName="Korvold"
          rows={{ in: [], out: [cut(), cut({ oracleId: "o3", name: "Chrome Mox" })] }}
          {...SHAPE} state={{ ...STATE, commander: trade }} cardCount={CARD_COUNT} />,
      );
      expect(screen.queryByText("it moves to the command zone")).toBeNull();
    });

    // Change commander: a moved commander is a change the columns do not list, so emptying
    // them is not the deck back at its version, and the route does not redirect.
    it("does not call the last put-back the last change while the commander moved", async () => {
      render(
        <ReviewChanges mix={TEST_MIX}
          deckId="d" deckName="Korvold" rows={{ in: [], out: [cut()] }}
          {...SHAPE}
          state={{ ...STATE, commander: {
            from: { commanderOracleId: "korvold", partnerOracleId: null },
            to: { commanderOracleId: "prosper", partnerOracleId: null },
          } }}
          cardCount={CARD_COUNT}
        />,
      );
      await act(async () => {
        fireEvent.click(putBack());
      });
      await settle();
      const spoken = document.getElementById("draft-announcer")?.textContent ?? "";
      expect(spoken).toBe(deckVersioningCopy.restore.announcedLastOut("Mox Diamond", CARD_COUNT + 1));
    });

    // A commit started FIRST used to race a restore started second: the sheet is
    // not unmounted while its own write runs, so nothing on this page knew about
    // it, and the guard only ever shut one way.
    it("shuts Put back while the commit sheet's own write is in flight", async () => {
      let answer: ((value: unknown) => void) | null = null;
      commitDeckVersion.mockImplementation(() => new Promise((resolve) => { answer = resolve; }));
      render(
        <ReviewChanges mix={TEST_MIX}
          deckId="d" deckName="Korvold" rows={{ in: [], out: [cut()] }}
          {...SHAPE} state={STATE} cardCount={CARD_COUNT} commitOpen
        />,
      );
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: deckVersioningCopy.commit.cta(2) }));
      });
      expect(commitDeckVersion).toHaveBeenCalledTimes(1);

      await act(async () => {
        fireEvent.click(putBack());
      });
      expect(addCardToDeck).not.toHaveBeenCalled();
      await act(async () => {
        answer?.({ ok: true, number: 2, cardCount: CARD_COUNT, buy: [], pull: [] });
      });
    });

    // The destructive half of the same mirror. A discard already in flight used to
    // leave Put back live, and the two serialize on the deck lock: the discard
    // wins and the restore lands as a fresh draft on a deck that just went back
    // to its version.
    it("shuts Put back while the discard question's own write is in flight", async () => {
      let answer: ((value: unknown) => void) | null = null;
      discardDeckDraft.mockImplementation(() => new Promise((resolve) => { answer = resolve; }));
      mount({ in: [], out: [cut()] });
      await act(async () => {
        fireEvent.click(
          screen.getByRole("button", { name: deckVersioningCopy.pending.discardCta }),
        );
      });
      await act(async () => {
        // By pattern: the count is the fixture's whole change set, and naming a
        // figure here would pin the case to that fixture rather than to the rule.
        fireEvent.click(screen.getByRole("button", { name: /^Discard \d+ changes?$/ }));
      });
      expect(discardDeckDraft).toHaveBeenCalledTimes(1);

      await act(async () => {
        fireEvent.click(putBack());
      });
      expect(addCardToDeck).not.toHaveBeenCalled();
      await act(async () => {
        answer?.({ ok: true });
      });
    });

    // A throw can be a version that was WRITTEN and lost its reply, so the
    // outcome is unknown rather than failed — and dismissing the sheet is the
    // reader acknowledging a message, never the write becoming known. Only rows
    // the server built after the fact can settle it.
    it("keeps the page's writes shut after a commit throws, until new rows arrive", async () => {
      commitDeckVersion.mockRejectedValue(new Error("network"));
      const view = render(
        <ReviewChanges mix={TEST_MIX}
          deckId="d" deckName="Korvold" rows={{ in: [], out: [cut()] }}
          {...SHAPE} state={STATE} cardCount={CARD_COUNT} commitOpen
        />,
      );
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: deckVersioningCopy.commit.cta(2) }));
      });
      await screen.findByText(deckVersioningCopy.commit.unresolved);

      // The way out of the sheet stays live — a reader who cannot commit should
      // still be able to stop asking — and taking it unmounts the sheet.
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: deckVersioningCopy.commit.cancel }));
      });
      await act(async () => {
        fireEvent.click(putBack());
      });
      expect(addCardToDeck).not.toHaveBeenCalled();

      // The refresh landing: a new rows object is the server's answer, and the
      // page takes the reader at their word again.
      await act(async () => {
        view.rerender(
          <ReviewChanges mix={TEST_MIX}
            deckId="d" deckName="Korvold" rows={{ in: [], out: [cut()] }}
            {...SHAPE} state={STATE} cardCount={CARD_COUNT}
          />,
        );
      });
      await act(async () => {
        fireEvent.click(putBack());
      });
      expect(addCardToDeck).toHaveBeenCalledTimes(1);
    });

    // The mirror of the case above, on the door that was already shut for a
    // restore in flight: `restoring` goes false the moment the transition
    // settles, so both doors used to come back live while the restore's outcome
    // was still unknown.
    it("keeps both doors shut after a restore throws, until new rows arrive", async () => {
      addCardToDeck.mockRejectedValue(new Error("network"));
      const view = mount({ in: [], out: [cut(), cut({ oracleId: "o3", name: "Chrome Mox" })] });
      await act(async () => {
        fireEvent.click(putBack());
      });
      await settle();
      await screen.findByText(deckVersioningCopy.restore.failed);
      expect(
        screen.getByRole("button", { name: deckVersioningCopy.pending.commitCta(2) }),
      ).toBeDisabled();
      expect(
        screen.getByRole("button", { name: deckVersioningCopy.pending.discardCta }),
      ).toBeDisabled();

      await act(async () => {
        view.rerender(
          <ReviewChanges mix={TEST_MIX}
            deckId="d" deckName="Korvold" rows={{ in: [], out: [cut()] }}
            {...SHAPE} state={STATE} cardCount={CARD_COUNT}
          />,
        );
      });
      expect(
        screen.getByRole("button", { name: deckVersioningCopy.pending.commitCta(2) }),
      ).toBeEnabled();
      expect(
        screen.getByRole("button", { name: deckVersioningCopy.pending.discardCta }),
      ).toBeEnabled();
    });

    // The whole row is a button that opens the card. Without `stopPropagation`
    // putting a card back also opens it.
    it("does not open the card it puts back", async () => {
      mount({ in: [], out: [cut()] });
      await act(async () => {
        fireEvent.click(putBack());
      });
      await settle();
      expect(screen.queryByText(cardDetailCopy.loading)).toBeNull();
    });
  });
});

describe("a printed add on the review screen", () => {
  // Built from the suite's own `row()` so every required field is present — the
  // literal I first wrote was missing several and failed inside the component.
  const proxiedRow = (over: Partial<Row> = {}) =>
    row({
      name: "The Ozolith",
      owned: false,
      proxied: true,
      bucket: "proxied" as Row["bucket"],
      // A REAL availability, not null. Left null, the test proved only that the
      // proxy beats the unowned buy branch — a marker-first implementation would
      // still reach the proxy, because there was no marker data to render.
      availability: { owned: 1, hard: 0, soft: 1, free: 0, claims: [] } as Row["availability"],
      ...over,
    });

  it("draws the mark, not a buy tag", () => {
    // THE SHIPPED DEFECT. `AvailabilitySlot` opened on `!card.owned`, and a
    // printed card is unowned by design — so this screen quoted a price for a
    // card its owner had decided not to buy.
    const { container } = render(<ReviewChanges mix={TEST_MIX} deckId="d" deckName="Korvold" rows={{ in: [proxiedRow()], out: [] }} {...SHAPE} state={STATE} cardCount={CARD_COUNT} />);
    // The GLYPH, drawn: the tag's spoken word is deliberately suppressed on this
    // row, where the full sentence rides `aria-describedby` instead.
    expect(container.textContent).toContain(proxyCopy.tag.glyph);
    expect(screen.queryByText(addPanelCopy.unowned.tag)).not.toBeInTheDocument();
  });

  it("says a full sentence to a screen reader, not a bare word", () => {
    // The row's visible mark is the tag; its per-row word is read aloud. A bare
    // `proxied` would not say why the row costs nothing, which is the whole
    // reason it is not simply silent like a `free` add.
    render(<ReviewChanges mix={TEST_MIX} deckId="d" deckName="Korvold" rows={{ in: [proxiedRow()], out: [] }} {...SHAPE} state={STATE} cardCount={CARD_COUNT} />);

    // Through `aria-describedby`, not merely present in the DOM: a sentence
    // rendered anywhere on the page would satisfy the weaker assertion while
    // reaching no reader on this row.
    const trigger = screen.getByRole("button", { name: /The Ozolith/ });
    const describedBy = trigger.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy as string)?.textContent)
      .toContain(proxyCopy.review.a11y("The Ozolith"));

    // And exactly ONCE: the tag's own spoken word is suppressed here, or the
    // same state is announced twice.
    expect(screen.queryByText(proxyCopy.tag.aria)).toBeNull();
  });

  it("is not silent, which a `free` add would have been", () => {
    // Silence was available at no cost — `bucketWord` returns null for `free` —
    // and it is wrong: `free` means the collection has a spare copy for this.
    render(<ReviewChanges mix={TEST_MIX} deckId="d" deckName="Korvold" rows={{ in: [proxiedRow()], out: [] }} {...SHAPE} state={STATE} cardCount={CARD_COUNT} />);
    const freeRow = row({ name: "Sol Ring", bucket: "free" as Row["bucket"] });
    cleanup();
    render(<ReviewChanges mix={TEST_MIX} deckId="d" deckName="Korvold" rows={{ in: [freeRow], out: [] }} {...SHAPE} state={STATE} cardCount={CARD_COUNT} />);
    expect(screen.queryByText(proxyCopy.review.a11y("Sol Ring"))).not.toBeInTheDocument();
  });
});

describe("ReviewChanges — the second door", () => {
  const contestedCard = (over: Partial<ContestedCard> = {}): ContestedCard => ({
    oracleId: "o1",
    cardName: "Brushland",
    arrived: 1,
    ownedBefore: 0,
    // FALSE, matching what `loadContestedCards` supplies on this route: nothing arrived on the
    // deck's own review page. A fixture saying otherwise exercises the receipt's wording here
    // and would stay green if the door wired the wrong surface.
    fromImport: false,
    owned: 1,
    brewNames: [],
    // In commit order, as the loader returns them: the earlier deck first. The component does not
    // re-sort — that is the loader's job — so this is what "never promoted" is asserted against.
    claimants: [
      { deckId: "d2", deckName: "Other deck", quantity: 1, commanderCopies: 0, granted: 0, since: 0, versionNumber: 1, allocated: 1 },
      { deckId: "d", deckName: "This deck", quantity: 1, commanderCopies: 0, granted: 0, since: 1, versionNumber: 3, allocated: 0 },
    ],
    ...over,
  });

  // The door is for INCOMING rows. An outgoing row is a card this draft removes, and committing
  // that removal prunes any reservation made for it — so a chooser there offers a decision the
  // next commit discards. The page passes only its in-rows; this pins the component beside it.
  it("hangs the chooser under a contested row, with the caption that separates it from a pull", () => {
    render(
      <ReviewChanges mix={TEST_MIX}
        deckId="d" deckName="Korvold" rows={{ in: [row()], out: [] }}
        {...SHAPE} contested={[contestedCard()]} state={STATE} cardCount={CARD_COUNT}
      />,
    );
    expect(screen.getByRole("radiogroup")).toBeTruthy();
    // The one place the distinction is spelt out: `Pull it` cuts the other deck a version, and
    // this edits nobody's list.
    expect(screen.getByText(cardAssignmentsCopy.contested.seamCaption)).toBeTruthy();
  });

  it("counts the contested cards on the strip, in the over state's own ink", () => {
    render(
      <ReviewChanges mix={TEST_MIX}
        deckId="d" deckName="Korvold" rows={{ in: [row()], out: [] }}
        {...SHAPE}
        // TWO cards, one of them asking for three copies. The figure is a count of CARDS —
        // decisions waiting on this page — so a regression to copies would read 4 here, and a
        // test that only proves the label exists would stay green through it.
        contested={[
          contestedCard({ arrived: 3, owned: 3 }),
          contestedCard({ oracleId: "o2", cardName: "Birds of Paradise" }),
        ]}
        state={STATE} cardCount={CARD_COUNT}
      />,
    );
    const chip = screen.getByText(deckVersioningCopy.review.chipShort).closest("span")
      ?.parentElement;
    expect(chip?.textContent).toContain("2");
    expect(chip?.textContent).not.toContain("4");
  });

  it("points the chooser at the caption that says how it differs from Pull it", () => {
    render(
      <ReviewChanges mix={TEST_MIX}
        deckId="d" deckName="Korvold" rows={{ in: [row()], out: [] }}
        {...SHAPE} contested={[contestedCard()]} state={STATE} cardCount={CARD_COUNT}
      />,
    );
    // A reader who tabs into the group never passes the paragraph above it, so the group has to
    // carry it: the caption is the ONLY thing separating giving a copy away from `Pull it`.
    const group = screen.getByRole("radiogroup");
    const id = group.getAttribute("aria-describedby");
    expect(id).toBeTruthy();
    expect(document.getElementById(id!)?.textContent).toBe(
      cardAssignmentsCopy.contested.seamCaption,
    );
  });

  it("drops the chip at nought rather than drawing a nought", () => {
    render(
      <ReviewChanges mix={TEST_MIX}
        deckId="d" deckName="Korvold" rows={{ in: [row()], out: [] }}
        {...SHAPE} state={STATE} cardCount={CARD_COUNT}
      />,
    );
    expect(screen.queryByText(deckVersioningCopy.review.chipShort)).toBeNull();
  });

  it("draws no panel on a row nobody is contesting", () => {
    render(
      <ReviewChanges mix={TEST_MIX}
        deckId="d" deckName="Korvold" rows={{ in: [row()], out: [] }}
        {...SHAPE} state={STATE} cardCount={CARD_COUNT}
      />,
    );
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(screen.queryByText(cardAssignmentsCopy.contested.seamCaption)).toBeNull();
  });

  // The row keeps its own floor — name, availability, `Pull it` — and the panel is a second
  // geometry below it. Folding the chooser into the row is what the card-row floor refuses.
  it("leaves the decklist row's own controls where they were", () => {
    render(
      <ReviewChanges mix={TEST_MIX}
        deckId="d" deckName="Korvold" rows={{ in: [row()], out: [] }}
        {...SHAPE} contested={[contestedCard()]} state={STATE} cardCount={CARD_COUNT}
      />,
    );
    const group = screen.getByRole("radiogroup");
    // The panel is a SIBLING of the row, not a descendant of it — asserted against the row's own
    // element rather than a selector nothing renders. An earlier version reached for
    // `closest("[data-diff-row]")`, an attribute no diff row carries, so it returned null however
    // the markup was nested and proved nothing at all.
    const rowName = screen.getByText("Sol Ring");
    const rowEl = rowName.closest("div");
    expect(rowEl).toBeTruthy();
    expect(rowEl?.contains(group)).toBe(false);
    // …and it follows the row in document order, which is what "beneath" means here.
    expect(rowName.compareDocumentPosition(group) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  // `this deck` is tagged and stays where the queue puts it: the order IS the explanation of the
  // default, and lifting the reader's own deck to the top hides why it lost.
  it("tags the deck being reviewed among the claimants, without promoting it", () => {
    render(
      <ReviewChanges mix={TEST_MIX}
        deckId="d" deckName="Korvold" rows={{ in: [row()], out: [] }}
        {...SHAPE} contested={[contestedCard()]} state={STATE} cardCount={CARD_COUNT}
      />,
    );
    expect(screen.getByText(cardAssignmentsCopy.contested.thisDeck)).toBeTruthy();
    // Still in commit order: the earlier deck leads, however much this page belongs to `d`.
    // Read off the OPTIONS rather than by text sweep — the page's live regions quote deck names
    // too, and a sweep picks one of those up first.
    const options = screen.getAllByRole("radio").map((o) => o.getAttribute("aria-label") ?? "");
    expect(options[0]).toContain("Other deck");
    expect(options[1]).toContain("This deck");
  });
});

// The decklist and the top-off list already show the card under the pointer.
// This page names the same cards and showed nothing, so a reader weighing a cut
// had to open each one. The rule is the shared provider's and
// `hover-preview.test.tsx` owns it; asserted here is that this page mounts one
// and hands every row its art, both columns alike.
describe("ReviewChanges — the hover preview", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: (query: string) => ({
        matches: query === "(hover: hover)",
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it.each([
    ["an add", { in: [row({ imageUri: "https://img/sol.jpg" })], out: [] }],
    [
      "a cut",
      { in: [], out: [row({ imageUri: "https://img/sol.jpg", direction: "out", from: 1, to: 0 })] },
    ],
  ])("shows the card's art over %s", (_, rows) => {
    render(
      <ReviewChanges mix={TEST_MIX} deckId="d" deckName="Korvold" rows={rows} {...SHAPE} state={STATE} cardCount={CARD_COUNT} />,
    );
    expect(screen.queryByTestId("hover-preview")).toBeNull();
    fireEvent.mouseEnter(screen.getByRole("button", { name: cardDetailCopy.triggerAria("Sol Ring") }), { clientX: 100, clientY: 100 });
    act(() => {
      vi.advanceTimersByTime(240);
    });
    expect(screen.getByTestId("hover-preview").style.background).toContain("https://img/sol.jpg");
  });
});
