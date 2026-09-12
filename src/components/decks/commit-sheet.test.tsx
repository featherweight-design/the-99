// §Surfaces 3 — the commit sheet. What is asserted here is what the player can
// read in the one breath before the irreversible click: a total rather than the
// list they have just read, the note and the fact that it can never be added
// afterwards, one way out to Mana Pool, and — after the click — the size of the
// version the SERVER wrote rather than a count taken on this side of the wire.

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import type { DraftAdd, DraftState } from "../../lib/decks/draft-shape";
import { DRAFT_ANNOUNCER_ID } from "./draft-announcer";
import { COMMITTED } from "./__fixtures__/draft-state";
import { CommitSheet } from "./commit-sheet";

vi.mock("../../app/decks/actions", () => ({ commitDeckVersion: vi.fn() }));
import { commitDeckVersion } from "../../app/decks/actions";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));

const copy = deckVersioningCopy.commit;

/** Three cards nobody owns and five sleeved elsewhere, one copy short each — the
 *  8 · `$254.10` the design draws, and the `3 not owned · 5 still sleeved`
 *  breakdown that has to add up to it. */
const BUY_NAMES = [
  "Sol Ring", "Mox Diamond", "Mana Crypt",
  "Chrome Mox", "Lotus Petal", "Grim Monolith", "Basalt Monolith", "Jeweled Lotus",
];

const add = (i: number): DraftAdd => ({
  oracleId: `o${i}`,
  needed: 1,
  shortfall: 1,
  bucket: i < 3 ? "unowned" : "claimed",
  heldBy: i < 3 ? [] : [{ id: "holder", name: "Kykar" }],
});

const CUT_NAMES = ["Cultivate", "Kodama's Reach"];

const STATE_36: DraftState = {
  ...COMMITTED,
  // v2 behind the draft, so the sheet is offering v3 — the version every string
  // on it names.
  version: { ...COMMITTED.version!, number: 2 },
  adds: BUY_NAMES.map((_, i) => add(i)),
  addChanges: BUY_NAMES.map((_, i) => ({ oracleId: `o${i}`, from: 0, to: 1 })),
  removes: CUT_NAMES.map((_, i) => ({ oracleId: `c${i}`, from: 1, to: 0 })),
  names: new Map([
    ...BUY_NAMES.map((name, i) => [`o${i}`, name] as const),
    ...CUT_NAMES.map((name, i) => [`c${i}`, name] as const),
  ]),
  claimsKnown: true,
  unfreeCount: 8,
  buyCount: 8,
  pullableCount: 5,
  total: "$254.10",
  pricedCopies: 8,
};

type Row = Parameters<typeof CommitSheet>[0]["rows"]["in"][number];

const row = (oracleId: string, name: string, over: Partial<Row> = {}): Row => ({
  oracleId, name, typeLine: "Artifact", cardTypeGroup: "Artifacts",
  role: "ramp" as const, owned: false, quantity: 1, auto: false,
  printedName: null, printedSetCode: null, printedCollectorNumber: null,
  cmc: 1, direction: "in" as const, from: 0, to: 1, bucket: "unowned" as const, ...over,
});

const ROWS_36 = {
  in: BUY_NAMES.map((name, i) => row(`o${i}`, name)),
  out: CUT_NAMES.map((name, i) =>
    row(`c${i}`, name, { direction: "out" as const, from: 1, to: 0, bucket: "free" as const }),
  ),
};

/** 99 cards in the list being frozen. The server's figure, which is why it is a
 *  prop rather than a sum of the rows above. */
const CARD_COUNT = 99;

function sheet(over: Partial<Parameters<typeof CommitSheet>[0]> = {}) {
  return render(
    <CommitSheet
      deckId="d"
      state={STATE_36}
      rows={ROWS_36}
      cardCount={CARD_COUNT}
      onCancel={vi.fn()}
      {...over}
    />,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  // Outside React's tree on purpose — see `draft-announcer.ts` — so `cleanup`
  // does not take it, and a sentence left behind would be read as the next
  // test's.
  document.getElementById(DRAFT_ANNOUNCER_ID)?.remove();
});

describe("CommitSheet", () => {
  it("carries the total and no rows — the review page above it has the rows", () => {
    sheet();
    expect(screen.getByText(copy.buyHeading)).toBeTruthy();
    expect(screen.getByText("8")).toBeTruthy();
    expect(screen.getByText("$254.10")).toBeTruthy();
    // The breakdown adds up to the figure above it: three copies of cards nobody
    // owns, five sitting in other decks.
    expect(screen.getByText(copy.buyBreakdown(3, 5))).toBeTruthy();
    expect(screen.getByText(copy.buyBackLink(8))).toBeTruthy();
    expect(screen.getByText(copy.footer(CARD_COUNT, 8, 2))).toBeTruthy();
    // A confirmation that re-lists what you just read is a second copy, not a
    // confirmation — so no card on either list is named in here.
    expect(screen.queryByText("Sol Ring")).toBeNull();
    expect(screen.queryByText("Cultivate")).toBeNull();
  });

  it("offers the note, and says plainly that it cannot be added later", () => {
    sheet();
    expect(screen.getByLabelText(copy.noteLabel)).toBeTruthy();
    expect(screen.getByText(copy.noteWarning)).toBeTruthy();
    // The warning's whole point is to be read BEFORE the field is used. Once a
    // player is typing into it, the same sentence is a reprimand.
    fireEvent.change(screen.getByLabelText(copy.noteLabel), { target: { value: "cut the mill" } });
    expect(screen.queryByText(copy.noteWarning)).toBeNull();
  });

  it("links out to Mana Pool with the buy list, and only when there is one", () => {
    sheet();
    expect(
      screen.getByRole("link", { name: copy.linkOut }).getAttribute("href"),
    ).toContain("manapool.com/add-deck?deck=");

    cleanup();
    // Every card coming in has a free copy: the money block is absent whole, and
    // the link with it — there is nothing to shop for.
    sheet({ state: { ...STATE_36, adds: [], buyCount: 0, unfreeCount: 0, total: null } });
    expect(screen.queryByRole("link", { name: copy.linkOut })).toBeNull();
    expect(screen.queryByText(copy.buyHeading)).toBeNull();
  });

  it("announces the version's real size, from the server's own count", async () => {
    vi.mocked(commitDeckVersion).mockResolvedValue({
      ok: true, number: 3, cardCount: 101, buy: [], pull: [],
    });
    sheet();
    await act(async () => {
      screen.getByRole("button", { name: copy.cta(3) }).click();
    });
    // 101, not the 99 this sheet was handed and not a tally of the rows above:
    // the version's size is whatever the snapshot actually wrote.
    expect(screen.getByRole("status").textContent).toBe(copy.announced(3, 101, 8));
    expect(push).toHaveBeenCalledWith("/decks/d");
  });

  it("keeps the changes and says so when the write is refused", async () => {
    vi.mocked(commitDeckVersion).mockResolvedValue({ ok: false, message: "We couldn't find that deck." });
    sheet();
    await act(async () => {
      screen.getByRole("button", { name: copy.cta(3) }).click();
    });
    expect(screen.getByText(copy.refused)).toBeTruthy();
    // Nothing navigates and nothing collapses: the draft is still here, and so
    // is the sheet that was about to freeze it.
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: copy.cta(3) })).toBeTruthy();
  });
});
