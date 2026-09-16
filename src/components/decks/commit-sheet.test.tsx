// §Surfaces 3 — the commit sheet. What is asserted here is what the player can
// read in the one breath before the irreversible click: a total rather than the
// list they have just read, the note and the fact that it can never be added
// afterwards, one way out to Mana Pool, and — after the click — the size of the
// version the SERVER wrote rather than a count taken on this side of the wire.

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import type { BucketedAdd } from "../../lib/decks/draft-diff";
import type { DraftAdd, DraftState } from "../../lib/decks/draft-shape";
import { COMMIT_RECEIPT_HASH, DRAFT_ANNOUNCER_ID } from "./draft-announcer";
import { COMMITTED } from "./__fixtures__/draft-state";
import { CommitSheet } from "./commit-sheet";

vi.mock("../../app/decks/actions", () => ({ commitDeckVersion: vi.fn() }));
import { commitDeckVersion } from "../../app/decks/actions";

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));

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

/** The same eight as the write returns them — every one unfree, which is what
 *  `commitDeckVersion` filters its list down to before handing it back. */
const WROTE_EIGHT: BucketedAdd[] = BUY_NAMES.map((_, i) => ({
  oracleId: `o${i}`,
  needed: 1,
  shortfall: 1,
  bucket: i < 3 ? "unowned" : "claimed",
  heldBy: i < 3 ? [] : [{ id: "holder", name: "Kykar" }],
}));

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
  cmc: 1, direction: "in" as const, from: 0, to: 1, bucket: "unowned" as const,
  shortfall: 1, ...over,
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

  // `buyCount` is 0 both when there is nothing to buy and when the claim read
  // failed, and only the first of those is a fact. A footer printing the nought
  // would tell the player their shopping is done on the strength of a read the
  // server could not make — so the term goes rather than the figure.
  it("drops the purchase term when the claims could not be read", () => {
    sheet({
      state: {
        ...STATE_36,
        claimsKnown: false,
        buyCount: 0,
        unfreeCount: 0,
        total: null,
        adds: STATE_36.adds.map((a) => ({ ...a, bucket: null, shortfall: 0 })),
      },
    });
    expect(screen.getByText(copy.footerUnknown(CARD_COUNT, 2))).toBeTruthy();
    expect(screen.queryByText(copy.footer(CARD_COUNT, 0, 2))).toBeNull();
    // The money block is already absent at a nought buy count, so the footer was
    // the last place on the sheet quoting a purchase nobody read.
    expect(screen.queryByText(copy.buyHeading)).toBeNull();
  });

  // COPIES released, never rows: a card cut from three copies to one puts two
  // back, and the figure sits in the same line as a buy count of copies.
  it("counts the released copies rather than the rows that released them", () => {
    sheet({ state: { ...STATE_36, removes: [{ oracleId: "c0", from: 3, to: 1 }] } });
    expect(screen.getByText(copy.footer(CARD_COUNT, STATE_36.buyCount, 2))).toBeTruthy();
    expect(screen.queryByText(copy.footer(CARD_COUNT, STATE_36.buyCount, 1))).toBeNull();
  });

  it("offers the note, and says plainly that it cannot be added later", () => {
    sheet();
    expect(screen.getByLabelText(copy.noteLabel)).toBeTruthy();
    expect(screen.getByText(copy.noteWarning)).toBeTruthy();
    // A typed note and an empty one differ in nothing but the field's value
    // (state C24). The sentence is a fact about the version, so it survives the
    // keystroke that would have read as a reprimand.
    fireEvent.change(screen.getByLabelText(copy.noteLabel), { target: { value: "cut the mill" } });
    expect(screen.getByText(copy.noteWarning)).toBeTruthy();
  });

  // The note is a fact about the version and the figures are a fact about the
  // commit: the canvas draws the reason first at both widths, directly under the
  // lede that names the version being cut.
  it("puts the note above the figures it explains", () => {
    const { container } = sheet();
    const field = screen.getByLabelText(copy.noteLabel);
    const buy = screen.getByText(copy.buyHeading);
    expect(field.compareDocumentPosition(buy) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.querySelectorAll("textarea")).toHaveLength(1);
  });

  // The two terms are the figure above them explained, so they are read at both
  // widths; the link under them is the one part of the block that stays on
  // desktop, where the rows it points at are a glance away rather than a scroll.
  it("reads the breakdown on the phone and keeps the back link to desktop", () => {
    sheet();
    const breakdown = screen.getByText(copy.buyBreakdown(3, 5));
    expect(breakdown.className).not.toContain("hidden");
    expect(breakdown.className).toContain("text-[10px]");
    expect(breakdown.className).toContain("md:text-[10.5px]");
    expect(breakdown.className).toContain("md:leading-[1.55]");
    expect(screen.getByText(copy.buyBackLink(8)).className).toContain("hidden md:block");
  });

  // Under the button at both widths. Inside the bar's own wrapping row the
  // message landed after `Cancel` on desktop, beside the figures, which reads as
  // a footnote rather than as the refusal of the click just made.
  it("writes the refusal under the commit button", async () => {
    vi.mocked(commitDeckVersion).mockResolvedValue({ ok: false, message: "gone" });
    sheet();
    const cta = screen.getByRole("button", { name: copy.cta(3) });
    await act(async () => {
      cta.click();
    });
    const refusal = screen.getByText(copy.refused);
    expect(cta.parentElement?.contains(refusal)).toBe(true);
    expect(
      cta.compareDocumentPosition(refusal) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    // Never in the bar's own order, where `Cancel` sits between the two.
    expect(refusal.closest("[class*='order-last']")).toBeNull();
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
      ok: true, number: 3, cardCount: 101, buy: WROTE_EIGHT, pull: [],
    });
    sheet();
    await act(async () => {
      screen.getByRole("button", { name: copy.cta(3) }).click();
    });
    // 101, not the 99 this sheet was handed and not a tally of the rows above:
    // the version's size is whatever the snapshot actually wrote.
    expect(screen.getByRole("status").textContent).toBe(copy.announced(3, 101, 8));
    // With the receipt hash: the deck page's version line reads it to take focus,
    // which is the only thing telling a keyboard reader where the commit landed.
    expect(push).toHaveBeenCalledWith(`/decks/d${COMMIT_RECEIPT_HASH}`);
  });

  // The version was written and the claim read behind the receipt was not. The
  // commit is announced, because it happened; the shopping is the one thing
  // nobody can speak to, and 0 there would call it finished.
  it("announces the version and says nothing about buying when the claim read failed", async () => {
    vi.mocked(commitDeckVersion).mockResolvedValue({
      ok: true, number: 3, cardCount: 101, buy: null, pull: [],
    });
    sheet();
    await act(async () => {
      screen.getByRole("button", { name: copy.cta(3) }).click();
    });
    const region = screen.getByRole("status");
    expect(region.textContent).toBe(copy.announcedBuyUnknown(3, 101));
    // The card count is still spoken — it is the version's own figure. What is
    // absent is any claim about shopping, including a nought one.
    expect(region.textContent).toContain("101 cards");
    expect(region.textContent).not.toContain("to buy");
  });

  // The figure announced is the one the WRITE read, not the one this page was
  // rendered with: a copy freed between the page's read and the click leaves the
  // rendered figure describing a commit nobody made. It is a receipt read beside
  // the write rather than inside it — see `commitDeckVersion`, which reads claims
  // on `db` deliberately — so what it promises is "newer than the page", never
  // "identical to the snapshot".
  it("announces the purchase the write decided, not the one the page rendered", async () => {
    vi.mocked(commitDeckVersion).mockResolvedValue({
      ok: true,
      number: 3,
      cardCount: 101,
      // Two of the eight turned out to be free, and one of the six left wants a
      // second copy — so the figure is copies short and never rows.
      buy: [
        ...WROTE_EIGHT.slice(0, 5),
        { ...WROTE_EIGHT[5], needed: 2, shortfall: 2 },
      ],
      pull: [],
    });
    sheet();
    await act(async () => {
      screen.getByRole("button", { name: copy.cta(3) }).click();
    });
    expect(screen.getByRole("status").textContent).toBe(copy.announced(3, 101, 7));
    // Emphatically not `state.buyCount`, which is what the page above was drawn
    // with, nor a count of the rows the write returned.
    expect(screen.getByRole("status").textContent).not.toContain("8");
    expect(screen.getByRole("status").textContent).not.toContain("6");
  });

  // A commit-only page draws no `PullControl` — a first commit, a removals-only
  // draft, a draft whose every add is free — so nothing else has put the region
  // in the document. Created and filled in one operation it is not announced at
  // all, and the navigation that follows takes the sheet with it.
  it("puts its live region in the document empty, before any commit", () => {
    sheet({ state: { ...STATE_36, adds: [], buyCount: 0, unfreeCount: 0, total: null } });
    const region = screen.getByRole("status");
    expect(region.getAttribute("aria-live")).toBe("polite");
    expect(region.textContent).toBe("");
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

  // A throw is not a refusal: the version may have been written and the reply
  // lost, so the sheet cannot promise the changes are still here.
  it("admits the outcome is unknown when the write throws, and re-reads", async () => {
    vi.mocked(commitDeckVersion).mockRejectedValue(new Error("offline"));
    sheet();
    await act(async () => {
      screen.getByRole("button", { name: copy.cta(3) }).click();
    });
    expect(screen.getByText(copy.unresolved)).toBeTruthy();
    expect(screen.queryByText(copy.refused)).toBeNull();
    expect(refresh).toHaveBeenCalledTimes(1);
    // No receipt and no navigation for a version nobody can say exists.
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe("");
  });

  // The latch is held through an unknown outcome, so the offer has to be withheld
  // with it: a sheet whose button stayed enabled over a shut latch would look live
  // and swallow every press — and a commit that threw is precisely when a reader
  // tries again. The re-read is what gives the offer back.
  it("withholds the offer while the outcome is unknown, and restores it on the re-read", async () => {
    vi.mocked(commitDeckVersion).mockRejectedValue(new Error("offline"));
    const view = sheet();
    await act(async () => {
      screen.getByRole("button", { name: copy.cta(3) }).click();
    });
    expect(screen.getByText(copy.unresolved)).toBeTruthy();
    expect(screen.getByRole("button", { name: copy.cta(3) })).toBeDisabled();

    // The refresh landing: a new state object is the server's answer.
    vi.mocked(commitDeckVersion).mockResolvedValue({
      ok: true, number: 3, cardCount: CARD_COUNT, buy: [], pull: [],
    });
    await act(async () => {
      view.rerender(
        <CommitSheet
          deckId="d" state={{ ...STATE_36 }} rows={ROWS_36} cardCount={CARD_COUNT} onCancel={vi.fn()}
        />,
      );
    });
    const retry = screen.getByRole("button", { name: copy.cta(3) });
    expect(retry).toBeEnabled();
    await act(async () => {
      retry.click();
    });
    // Not swallowed by a latch nobody reopened.
    expect(commitDeckVersion).toHaveBeenCalledTimes(2);
  });

  // A transition update is not visible to the next click in the same tick, so
  // `disabled={pending}` lands a render too late. Two presses used to send two
  // commits, and the first one's refusal would then open the host's controls
  // while the second was still in the air.
  it("sends one commit however fast the button is pressed twice", async () => {
    vi.mocked(commitDeckVersion).mockResolvedValue({
      ok: true, number: 3, cardCount: 99, buy: [], pull: [],
    });
    sheet();
    const go = screen.getByRole("button", { name: copy.cta(3) });
    await act(async () => {
      go.click();
      go.click();
    });
    expect(commitDeckVersion).toHaveBeenCalledTimes(1);
  });

  // The host is told in the same tick as the click, because a restore pressed in
  // the window before this sheet re-renders would otherwise read the guard as
  // open. `settled` follows a REFUSAL, where the server declined before it wrote,
  // and never a throw: that one can be a version that landed and lost its reply.
  it("reports its own write to the host, and never settles an unknown one", async () => {
    const onWriteState = vi.fn();
    vi.mocked(commitDeckVersion).mockRejectedValue(new Error("offline"));
    sheet({ onWriteState });
    await act(async () => {
      screen.getByRole("button", { name: copy.cta(3) }).click();
    });
    expect(onWriteState.mock.calls.map(([state]) => state)).toEqual(["writing", "unknown"]);
  });

  it("reports the refusal as settled, because nothing was written", async () => {
    const onWriteState = vi.fn();
    vi.mocked(commitDeckVersion).mockResolvedValue({ ok: false, message: "no" });
    sheet({ onWriteState });
    await act(async () => {
      screen.getByRole("button", { name: copy.cta(3) }).click();
    });
    expect(onWriteState.mock.calls.map(([state]) => state)).toEqual(["writing", "settled"]);
  });
});

// `pullNote` is split on its own punctuation to draw the opening clause in the
// reading ink. That makes the separator a contract between the copy module and
// this component: repunctuate the string and the split collapses to one run,
// losing the emphasis with no type error and nothing that looks broken. The
// 2026-09-13 em-dash sweep did exactly that and the whole suite stayed green.
describe("the pull note's emphasis survives a repunctuation", () => {
  // RENDERED, not split in the test. Asserting the split here with the same
  // delimiter the component uses proves only that the string contains a colon:
  // it passes whatever separator the component chose, which is the regression
  // it is supposed to catch. So the sheet is rendered in a state that draws the
  // note, and the two facts that matter are read off the DOM — the lead is the
  // bold run, and the paragraph reads as the whole authored sentence.
  it("draws the lead clause bold and the whole note intact", () => {
    sheet({ state: { ...STATE_36, removes: [{ oracleId: "c0", from: 3, to: 1 }] } });
    const lead = screen.getByText("No action required");
    expect(lead.tagName).toBe("B");
    expect(lead.closest("p")?.textContent).toBe(copy.pullNote);
  });
});
