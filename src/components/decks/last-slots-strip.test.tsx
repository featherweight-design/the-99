import { act, render as rtlRender, screen } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { synergyCopy } from "../../lib/copy/synergy-discovery";
import { topOffCopy } from "../../lib/copy/top-off";
import type { TopOffCandidateWithFacts } from "../../lib/decks/last-slots";
import { topOffDraftKey } from "../../lib/decks/top-off-draft";
import { reveal } from "../../lib/ui/reveal";
// The jump is `reveal`'s; its eased scroll is `reveal`'s own test.
vi.mock("../../lib/ui/reveal", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/ui/reveal")>()),
  reveal: vi.fn(),
}));

const actions = vi.hoisted(() => ({ commit: vi.fn(), chooseBulk: vi.fn() }));
vi.mock("../../app/decks/actions", () => ({
  // The top-off list asks for both bulk plans when it opens, so every test that renders it
  // reaches this. Answered with two EMPTY plans rather than a refusal: a refusal is drawn and
  // SPOKEN, which would put a second message in the live region and break the announcement
  // counts these files are actually about.
  bulkFillOptions: vi.fn().mockResolvedValue({
    ok: true,
    collection: { oracleIds: [], shortfalls: [], measuredTypes: true },
    best: { oracleIds: [], shortfalls: [], measuredTypes: true },
  }),
  commitTopOff: actions.commit,
  // THE SEED ASKS THE REAL FILL NOW. It used to slice this list by synergy, which is the
  // "what can I sleeve" thinking the button stopped doing — so the strip calls the same
  // action the button does, and these cases stub its answer.
  chooseBulkFill: actions.chooseBulk,
}));

import { LastSlotsStrip } from "./last-slots-strip";

// The list's rows open the card at every width, so they need the provider that
// `builder-shell.tsx` wraps the strip in. `rerender` keeps the wrapper.
function Detail({ children }: { children: ReactNode }) {
  return <CardDetailProvider fetchCard={async () => null}>{children}</CardDetailProvider>;
}
const render = (ui: ReactElement) => rtlRender(ui, { wrapper: Detail });

function candidate(id: string, owned: boolean): TopOffCandidateWithFacts {
  return {
    oracleId: id,
    name: id,
    typeLine: "Instant",
    facet: "spell",
    inclusionPct: 40,
    synergyPts: 20,
    imageUri: null,
    owned,
    committedTo: null,
    manaCost: null,
    price: null,
    availability: null,
    // A fixture row with no facts and no combo partner. STATED rather than omitted: both
    // fields are required on the deck-scoped row type, because a type that lets them be
    // omitted is a type that lets the page's attachment be deleted without a compile error.
    facts: null,
    comboPartner: null,
  };
}

const candidates = [
  candidate("owned-1", true),
  candidate("owned-2", true),
  candidate("buy-1", false),
];

const base = {
  deckId: "deck-1",
  openSlots: 3,
  // Every case here is a single-commander deck, which is the ceiling the
  // figures they assert on are written against.
  bodySize: 99,
  candidates,
  deckOracleIds: new Set<string>(),
  newestAsOf: null,
  declaredBracket: null,
  noteCounts: { gameChanger: 0, extraTurns: 0, tutor: 0 },
  next: true,
  onConsider: () => {},
  onAnnounce: () => {},
};

const doorName = (slots: string) => topOffCopy.strip.openAria(slots);

/** The repo has no user-event; a click plus a flushed microtask queue is what
 *  every other builder test uses, and it is what the settled commit needs. */
async function click(el: HTMLElement) {
  await act(async () => {
    el.click();
  });
}

beforeEach(() => {
  // Opening the list seeds and persists a draft, so any test that opens it
  // leaves one behind for the next. The reload tests read exactly that key,
  // and would otherwise pass or fail on the order the file happens to run in.
  localStorage.clear();
  actions.commit
    .mockReset()
    .mockResolvedValue({ ok: true, added: 1, total: 97, passId: "p1", boughtDelta: 0 });
  // The seed's default answer: both owned candidates. Reset per case, or a
  // `mockResolvedValue` set in one leaks into every later one.
  actions.chooseBulk
    .mockReset()
    .mockResolvedValue({ ok: true, oracleIds: ["owned-1", "owned-2"] });
});

describe("LastSlotsStrip", () => {
  // States 10 and 14. The row is arithmetic, not a flag: a full deck has no
  // last slots, so there is no row to draw for them.
  it("renders nothing at all when there are no open slots", () => {
    // Unwrapped: the provider draws live regions of its own, and no row is drawn at 0.
    const { container } = rtlRender(<LastSlotsStrip {...base} openSlots={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  // #361 deleted the two fill CTAs rather than restyling them. If either name
  // ever comes back this test is the one that says so.
  it("offers one door and neither retired fill control", () => {
    render(<LastSlotsStrip {...base} />);
    expect(screen.getByRole("button", { name: doorName("3") })).toBeEnabled();
    expect(screen.queryByRole("button", { name: /from my collection/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /top up/i })).toBeNull();
  });

  // The deck can fill from somewhere else — the quick-add dock is live at
  // desktop while the list is open — and that unmounts the strip without ever
  // calling close. The flags have to come down anyway, or the phone dock stays
  // hidden for a list that is gone.
  it("lowers the open and in-flight flags when the deck fills under it", async () => {
    const onOpenChange = vi.fn();
    const onInflight = vi.fn();
    const { rerender } = render(
      <LastSlotsStrip {...base} onOpenChange={onOpenChange} onInflight={onInflight} />,
    );
    await click(screen.getByRole("button", { name: doorName("3") }));
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    rerender(
      <LastSlotsStrip
        {...base}
        openSlots={0}
        onOpenChange={onOpenChange}
        onInflight={onInflight}
      />,
    );

    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(onInflight).toHaveBeenLastCalledWith(false);
  });

  // Suggested changes v2's `Top off on Your deck →` asks for the list open from another tab: the strip opens it once per
  // request, on arrival, and answers each one so the shell can drop it.
  it("opens the list once for each request from elsewhere, and answers it", async () => {
    const onOpenChange = vi.fn();
    const answered = vi.fn();
    const { rerender } = await act(async () =>
      render(<LastSlotsStrip {...base} onOpenChange={onOpenChange} openRequest={1} onOpenRequestAnswered={answered} />),
    );
    expect(answered).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    // The same request again opens nothing more; a new one is answered too.
    const opens = onOpenChange.mock.calls.length;
    await act(async () => {
      rerender(<LastSlotsStrip {...base} onOpenChange={onOpenChange} openRequest={1} onOpenRequestAnswered={answered} />);
    });
    expect(onOpenChange.mock.calls.length).toBe(opens);
    expect(answered).toHaveBeenCalledTimes(1);
    // A new value is a new request: answered too, and the list, already open, stays open.
    await act(async () => {
      rerender(<LastSlotsStrip {...base} onOpenChange={onOpenChange} openRequest={2} onOpenRequestAnswered={answered} />);
    });
    expect(answered).toHaveBeenCalledTimes(2);
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("answers a request with nothing to offer without opening", async () => {
    const onOpenChange = vi.fn();
    const answered = vi.fn();
    await act(async () => {
      render(<LastSlotsStrip {...base} candidates={[]} onOpenChange={onOpenChange} openRequest={2} onOpenRequestAnswered={answered} />);
    });
    expect(answered).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalledWith(true);
  });

  it("titles the row for the open slots and names the press in full", () => {
    render(<LastSlotsStrip {...base} />);
    expect(screen.getByText(topOffCopy.strip.open("3"))).toBeInTheDocument();
    const press = screen.getByRole("button", { name: doorName("3") });
    expect(press).toHaveTextContent(topOffCopy.strip.openShort);
    expect(press).toHaveAttribute("aria-expanded", "false");
  });

  it("names the pool and what the player can sleeve in the body", () => {
    render(<LastSlotsStrip {...base} />);
    expect(screen.getByText(topOffCopy.strip.rowBody("3", "2"))).toBeInTheDocument();
  });

  // The body states what the seed can fill, and the seed clamps to the open
  // slots. Two owned candidates for one slot arrives as one tick, so saying
  // two is a figure the open cannot keep.
  it("clamps the body's figure to the slots the seed can fill", () => {
    render(<LastSlotsStrip {...base} openSlots={1} />);
    expect(screen.getByText(topOffCopy.strip.rowBody("3", "1"))).toBeInTheDocument();
    expect(screen.queryByText(topOffCopy.strip.rowBody("3", "2"))).toBeNull();
  });

  // A player who owns none of the candidates seeds no ticks, and the body has
  // to say that rather than counting zero of them.
  it("says the player owns none when nothing in the pool is owned", () => {
    render(
      <LastSlotsStrip {...base} candidates={[candidate("buy-1", false), candidate("buy-2", false)]} />,
    );
    expect(screen.getByText(topOffCopy.strip.rowBodyNoneOwned("2"))).toBeInTheDocument();
    expect(screen.queryByText(topOffCopy.strip.rowBody("2", "0"))).toBeNull();
  });

  // State 13. The door has nothing to open, so the same row says why and its
  // press goes to Consider instead — no literal 99, the shortfall is the figure.
  it("draws the ran-out row in place of the door when the pool is empty", () => {
    render(<LastSlotsStrip {...base} candidates={[]} />);
    expect(screen.getByText(synergyCopy.lastSlots.exhaustedTitle("3"))).toBeInTheDocument();
    expect(screen.getByText(synergyCopy.lastSlots.exhaustedBody)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: doorName("3") })).toBeNull();
    expect(screen.getByRole("button", { name: topOffCopy.strip.exhaustedPressAria }))
      .toHaveTextContent(topOffCopy.strip.exhaustedPress);
  });

  // A card owned with every copy sleeved in another deck is offered, and rightly
  // — the player may still reclaim one. What it must not do is arrive PRE-TICKED,
  // where it is indistinguishable from a card they can sleeve tonight and
  // committing it costs either a purchase or a card out of another deck. That is
  // the act the list draws a buy tag for, made silently on their behalf.
  const claimed = (id: string): TopOffCandidateWithFacts => ({
    ...candidate(id, true),
    availability: { owned: 1, hard: 1, soft: 0, free: 0, claims: [] },
  });
  const spare = (id: string): TopOffCandidateWithFacts => ({
    ...candidate(id, true),
    availability: { owned: 2, hard: 1, soft: 0, free: 1, claims: [] },
  });

  it("promises only the owned cards it can actually seed", () => {
    render(
      <LastSlotsStrip {...base} candidates={[claimed("held-1"), claimed("held-2"), spare("free-1")]} />,
    );

    // One, not three: the body states what the seed can fill, so it reads the
    // same list the seed does or it overstates by exactly the cards whose every
    // copy is sleeved elsewhere.
    expect(screen.getByText(topOffCopy.strip.rowBody("3", "1"))).toBeInTheDocument();
    expect(screen.queryByText(topOffCopy.strip.rowBody("3", "3"))).toBeNull();
  });

  it("does not tell a player who owns every candidate that they own none", () => {
    // A seed of zero is two opposite facts. `rowBodyNoneOwned` says
    // `You own none of them`, which is false when the player owns all of them
    // and every copy is sleeved in another deck — and false to the player best
    // placed to notice. The OWNED count picks between them, never the seed.
    render(<LastSlotsStrip {...base} candidates={[claimed("held-1"), claimed("held-2")]} />);

    expect(screen.getByText(topOffCopy.strip.rowBodyNoneFree("2"))).toBeInTheDocument();
    expect(screen.queryByText(topOffCopy.strip.rowBodyNoneOwned("2"))).toBeNull();
  });

  it("still says `you own none` when the player really owns none", () => {
    render(<LastSlotsStrip {...base} candidates={[candidate("buy-1", false)]} />);

    expect(screen.getByText(topOffCopy.strip.rowBodyNoneOwned("1"))).toBeInTheDocument();
    expect(screen.queryByText(topOffCopy.strip.rowBodyNoneFree("1"))).toBeNull();
  });

  // THE SEED ASKS WHAT THE DECK NEEDS, which is the whole of this change. It used to take the
  // top N of this list by synergy — "what can I sleeve" where the player asked "what does this
  // deck need" — and #798 fixed that on the BUTTON while leaving it here, on the half a player
  // is actually shown.
  //
  // The fixture is ordered so the two rules disagree: `owned-1` leads the list by synergy, and
  // the action names `owned-2`. A seed still slicing the ranking ticks the first; one asking
  // the fill ticks what it was told.
  it("seeds what the fill chose, not the top of the synergy ranking", async () => {
    actions.chooseBulk.mockResolvedValue({ ok: true, oracleIds: ["owned-2"] });
    render(<LastSlotsStrip {...base} openSlots={1} />);

    await click(screen.getByRole("button", { name: doorName("1") }));

    expect(actions.chooseBulk).toHaveBeenCalledWith("deck-1", 1);
    const byName = (name: string) =>
      screen.getAllByRole("checkbox")
        .find((b) => (b.getAttribute("aria-label") ?? "").includes(name));
    expect(byName("owned-2")).toBeChecked();
    expect(byName("owned-1")).not.toBeChecked();
  });

  // UNMOUNT IS NOT A CLOSE, and the strip unmounts on its own — the deck page drops it the
  // moment `openSlots` reaches 0, which a quick-add can do while a seed is still out. The live
  // region belongs to the PARENT and outlives this component, so a continuation that announces
  // here describes a list that is no longer on screen to a screen reader that has no way to
  // know that. Bumping only the draft generation is not enough: it stops the ticks and routes
  // the continuation into the draft-moved branch, which announces.
  it("says nothing when the seed lands after the strip unmounted", async () => {
    let release: (v: unknown) => void = () => {};
    actions.chooseBulk.mockReturnValue(
      new Promise((r) => {
        release = r;
      }),
    );
    const onAnnounce = vi.fn();
    const { unmount } = render(<LastSlotsStrip {...base} onAnnounce={onAnnounce} />);

    await click(screen.getByRole("button", { name: doorName("3") }));
    onAnnounce.mockClear();

    unmount();
    await act(async () => {
      release({ ok: true, oracleIds: ["a"] });
    });

    expect(onAnnounce).not.toHaveBeenCalled();
  });

  // A refused seed leaves the list open with nothing ticked, and says nothing about it. The
  // player did not ask for the pre-tick, so a failure of it is not theirs to read.
  it("opens with nothing ticked when the fill refuses", async () => {
    actions.chooseBulk.mockResolvedValue({ ok: false, message: "nope" });
    const onAnnounce = vi.fn();
    render(<LastSlotsStrip {...base} onAnnounce={onAnnounce} />);

    await click(screen.getByRole("button", { name: doorName("3") }));

    expect(screen.queryAllByRole("checkbox", { checked: true })).toHaveLength(0);
    expect(onAnnounce).toHaveBeenCalledTimes(1);
    expect(onAnnounce.mock.calls[0][0]).toContain(topOffCopy.announce.opened("3", "3", "0"));
  });

  // THE OPEN IS ALWAYS ANNOUNCED, even when the answer is dropped. A seed that lands after the
  // player has acted must not tick — those cards were chosen for a deck nobody is looking at
  // any more — but the open still happened, and swallowing its message leaves a screen reader
  // with no account of a list that is now on screen.
  it("announces the open even when the seed is dropped as stale", async () => {
    let release: (v: unknown) => void = () => {};
    actions.chooseBulk.mockReturnValue(new Promise((r) => { release = r; }));
    const onAnnounce = vi.fn();
    render(<LastSlotsStrip {...base} onAnnounce={onAnnounce} />);

    await click(screen.getByRole("button", { name: doorName("3") }));
    // The player ticks by hand while the server thinks, which moves the draft.
    await click(screen.getAllByRole("checkbox")[0]);
    onAnnounce.mockClear();

    await act(async () => {
      release({ ok: true, oracleIds: ["owned-1", "owned-2"] });
    });

    expect(onAnnounce).toHaveBeenCalledTimes(1);
    expect(onAnnounce.mock.calls[0][0]).toContain(topOffCopy.announce.opened("3", "3", "1"));
  });

  // ONE MESSAGE PER OPEN. Closing and reopening announces for itself on the reopen path; an
  // answer from the first open arriving afterwards would put a second message in the live
  // region for one open, and the first of the pair is the zero the deferral exists to avoid.
  it("does not announce twice when the list is reopened before the seed lands", async () => {
    let release: (v: unknown) => void = () => {};
    actions.chooseBulk.mockReturnValue(new Promise((r) => { release = r; }));
    const onAnnounce = vi.fn();
    render(<LastSlotsStrip {...base} onAnnounce={onAnnounce} />);

    await click(screen.getByRole("button", { name: doorName("3") }));
    await click(screen.getAllByRole("button", { name: topOffCopy.strip.close })[0]);
    await click(screen.getByRole("button", { name: doorName("3") }));
    const afterReopen = onAnnounce.mock.calls.length;

    await act(async () => {
      release({ ok: true, oracleIds: ["owned-1", "owned-2"] });
    });

    expect(onAnnounce).toHaveBeenCalledTimes(afterReopen);
  });

  // A REFUSED SEED LEAVES IT OWED. Nothing happened, so a reopen may ask again — where a stale
  // one does not, because the player has acted and re-seeding would write over them.
  it("tries again on reopen after the seed is refused", async () => {
    actions.chooseBulk.mockResolvedValue({ ok: false, message: "nope" });
    render(<LastSlotsStrip {...base} />);

    await click(screen.getByRole("button", { name: doorName("3") }));
    expect(actions.chooseBulk).toHaveBeenCalledTimes(1);

    await click(screen.getAllByRole("button", { name: topOffCopy.strip.close })[0]);
    actions.chooseBulk.mockResolvedValue({ ok: true, oracleIds: ["owned-1"] });
    await click(screen.getByRole("button", { name: doorName("3") }));

    expect(actions.chooseBulk).toHaveBeenCalledTimes(2);
  });

  it("leaves a claimed card unticked when the list opens", async () => {
    // The body checks above read `seedCount`, which is derived from the same
    // list the seed is — so a regression that seeded from `ownedIds` while the
    // body kept reading `seedableIds` would pass every one of them with claimed
    // rows pre-ticked again. This opens the list and reads the boxes.
    // The ACTION offers both, so what keeps the claimed row unticked is the strip's own
    // intersection against `canSeed` rather than the stub being tidy. A seed that took the
    // answer wholesale would tick a card the player cannot sleeve.
    actions.chooseBulk.mockResolvedValue({ ok: true, oracleIds: ["held-1", "free-1"] });
    render(
      <LastSlotsStrip {...base} candidates={[claimed("held-1"), spare("free-1")]} />,
    );
    await click(screen.getByRole("button", { name: doorName("3") }));

    const boxes = screen.getAllByRole("checkbox");
    const byName = (name: string) =>
      boxes.find((b) => (b.getAttribute("aria-label") ?? "").includes(name));
    expect(byName("free-1")).toBeChecked();
    expect(byName("held-1")).not.toBeChecked();
  });

  it("seeds a card with no availability reading, which is the degraded case", () => {
    // A null reading is NO ROW — an unowned card, or a read that could not reach
    // — and reads as free everywhere else in the app. Seeding nothing here would
    // let one failed read silently empty the promise the strip makes.
    render(<LastSlotsStrip {...base} candidates={[candidate("unread", true)]} />);

    expect(screen.getByText(topOffCopy.strip.rowBody("1", "1"))).toBeInTheDocument();
  });

  it("does not claim nothing was ranked when the tail was simply cut", () => {
    // `exhaustedBody` says there was nothing left that EDHREC ranks, which is
    // false for a pool emptied by the negative cut: EDHREC ranked those cards,
    // and what it said was that they belong here less than in decks generally.
    render(<LastSlotsStrip {...base} candidates={[]} allNegative />);

    expect(screen.getByText(topOffCopy.strip.exhaustedAllNegative)).toBeInTheDocument();
    expect(screen.queryByText(synergyCopy.lastSlots.exhaustedBody)).toBeNull();
    // Nor that the collection ran out: the title says only that nothing is left to suggest.
    expect(screen.queryByText(/your collection ran out/)).toBeNull();
  });

  it("sends the ran-out press to Consider", async () => {
    const onConsider = vi.fn();
    render(<LastSlotsStrip {...base} candidates={[]} onConsider={onConsider} />);
    await click(screen.getByRole("button", { name: topOffCopy.strip.exhaustedPressAria }));
    expect(onConsider).toHaveBeenCalledOnce();
  });

  it("opens the list, seeds a tick per owned card, and announces the open once", async () => {
    const onAnnounce = vi.fn();
    const onOpenChange = vi.fn();
    render(<LastSlotsStrip {...base} onAnnounce={onAnnounce} onOpenChange={onOpenChange} />);

    await click(screen.getByRole("button", { name: doorName("3") }));

    expect(onOpenChange).toHaveBeenCalledWith(true);
    // Two owned rows in a pool of three, so two ticks — never three.
    expect(screen.getAllByRole("checkbox", { checked: true })).toHaveLength(2);
    // One live-region message per settle, and opening settles the pool size,
    // the open slots and the seed together.
    expect(onAnnounce).toHaveBeenCalledTimes(1);
    expect(onAnnounce.mock.calls[0][0]).toContain(topOffCopy.announce.opened("3", "3", "2"));
  });

  // One press, three faces: the door relabels to Close in place and back, so the
  // control under the cursor never unmounts.
  it("relabels the one press Close while the list is open, and back", async () => {
    render(<LastSlotsStrip {...base} />);
    const press = screen.getByRole("button", { name: doorName("3") });

    await click(press);
    expect(press).toHaveAccessibleName(topOffCopy.strip.close);
    expect(press).toHaveTextContent(topOffCopy.strip.closeShort);

    await click(press);
    expect(press).toHaveAccessibleName(doorName("3"));
    expect(press.isConnected).toBe(true);
  });

  // The selection survives a close, but the deck does not stand still: a
  // quick-add can take a slot without unticking anything. The reopen has to
  // announce what the list will show rather than what the player left.
  it("announces the reopened count the list can actually show", async () => {
    const onAnnounce = vi.fn();
    const { rerender } = render(<LastSlotsStrip {...base} onAnnounce={onAnnounce} />);
    await click(screen.getByRole("button", { name: doorName("3") }));
    await click(screen.getByRole("button", { name: topOffCopy.strip.close }));

    rerender(<LastSlotsStrip {...base} openSlots={1} onAnnounce={onAnnounce} />);
    await click(screen.getByRole("button", { name: doorName("1") }));

    const last = onAnnounce.mock.calls.at(-1)?.[0] as string;
    expect(last).toContain(topOffCopy.announce.opened("3", "1", "1"));
    expect(screen.getAllByRole("checkbox", { checked: true })).toHaveLength(1);
  });

  it("caps the seeded ticks at the open slots", async () => {
    render(<LastSlotsStrip {...base} openSlots={1} />);
    await click(screen.getByRole("button", { name: doorName("1") }));
    expect(screen.getAllByRole("checkbox", { checked: true })).toHaveLength(1);
  });

  // State 9, and the reason the selection is held here rather than in the list:
  // the list unmounts on close, so reopening must restore what the player left
  // instead of seeding over it.
  it("restores the selection on reopen instead of seeding again", async () => {
    render(<LastSlotsStrip {...base} />);

    await click(screen.getByRole("button", { name: doorName("3") }));
    await click(screen.getAllByRole("checkbox", { checked: true })[0]);
    expect(screen.getAllByRole("checkbox", { checked: true })).toHaveLength(1);

    await click(screen.getByRole("button", { name: topOffCopy.strip.close }));
    await click(screen.getByRole("button", { name: doorName("3") }));
    expect(screen.getAllByRole("checkbox", { checked: true })).toHaveLength(1);
  });

  // A click does not focus a button in every browser, so focus is placed on the
  // press's new face — never into the rows, which §1e rules out.
  it("moves focus to the close control when the door opens the list", async () => {
    render(<LastSlotsStrip {...base} />);
    await click(screen.getByRole("button", { name: doorName("3") }));

    const close = screen.getByRole("button", { name: topOffCopy.strip.close });
    expect(close).toHaveFocus();
    expect(close).toHaveAttribute("aria-expanded", "true");
  });

  // State 17 — the pool is frozen for the duration of a pass. A quick-add can
  // take the last candidates while the list is up, and gating the render on an
  // empty pool before the open flag would tear the selection down mid-pass and
  // stand the exhausted plate in its place.
  it("keeps the open list up when the pool empties under it", async () => {
    const { rerender } = render(<LastSlotsStrip {...base} />);
    await click(screen.getByRole("button", { name: doorName("3") }));

    rerender(<LastSlotsStrip {...base} candidates={[]} />);

    expect(screen.getByRole("button", { name: topOffCopy.strip.close })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: topOffCopy.strip.exhaustedPressAria })).toBeNull();
  });

  // A pass that takes the last candidates leaves slots open and no door, so the
  // close that ends the feature lands on the press's ran-out face, Consider.
  it("returns focus to the Consider press when the pass emptied the pool", async () => {
    const { rerender } = render(<LastSlotsStrip {...base} />);
    await click(screen.getByRole("button", { name: doorName("3") }));

    rerender(<LastSlotsStrip {...base} candidates={[]} />);
    await click(screen.getByRole("button", { name: topOffCopy.strip.close }));

    expect(screen.getByRole("button", { name: topOffCopy.strip.exhaustedPressAria })).toHaveFocus();
  });

  it("returns focus to the door when the list closes", async () => {
    render(<LastSlotsStrip {...base} />);
    await click(screen.getByRole("button", { name: doorName("3") }));
    await click(screen.getByRole("button", { name: topOffCopy.strip.close }));

    expect(screen.getByRole("button", { name: doorName("3") })).toHaveFocus();
  });

  // State 20 — one bottom slot, one occupant. The shell hides the quick-add
  // dock while the list's commit bar holds that slot.
  it("tells the shell when the list opens and when it closes", async () => {
    const onOpenChange = vi.fn();
    render(<LastSlotsStrip {...base} onOpenChange={onOpenChange} />);
    await click(screen.getByRole("button", { name: doorName("3") }));
    await click(screen.getByRole("button", { name: topOffCopy.strip.close }));

    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  // The list opens below the row, at 390px below the fold, and the player would
  // be handed a commit bar with no card on screen. Closing must not scroll: the
  // press is already where the reader is looking.
  it("brings the panel into view when the list opens, and not when it closes", async () => {
    const scroll = vi.mocked(reveal);
    scroll.mockClear();
    const { container } = render(<LastSlotsStrip {...base} />);
    await click(screen.getByRole("button", { name: doorName("3") }));
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(scroll.mock.calls[0][1]).toBe("start");
    expect(container.contains(scroll.mock.calls[0][0] as Node)).toBe(true);

    scroll.mockClear();
    await click(screen.getByRole("button", { name: topOffCopy.strip.close }));
    expect(scroll).not.toHaveBeenCalled();
  });

  // A remount with the same deck id is what a reload is, from this component's
  // point of view: the tree is built again from nothing. Choosing 31 cards and
  // losing them to an accidental refresh, silently, is the whole of #479.
  describe("across a reload", () => {
    it("brings back the selection the player left", async () => {
      const first = render(<LastSlotsStrip {...base} />);
      await click(screen.getByRole("button", { name: doorName("3") }));
      await click(screen.getAllByRole("checkbox", { checked: true })[0]);
      expect(screen.getAllByRole("checkbox", { checked: true })).toHaveLength(1);
      first.unmount();

      render(<LastSlotsStrip {...base} />);
      await click(screen.getByRole("button", { name: doorName("3") }));
      expect(screen.getAllByRole("checkbox", { checked: true })).toHaveLength(1);
    });

    // The seed would otherwise run on the reload's first open, because that is
    // the first open this mount has seen — putting back the two owned cards
    // the player had just cleared.
    it("does not seed over a restored selection", async () => {
      const first = render(<LastSlotsStrip {...base} />);
      await click(screen.getByRole("button", { name: doorName("3") }));
      for (const box of screen.getAllByRole("checkbox", { checked: true })) await click(box);
      expect(screen.queryAllByRole("checkbox", { checked: true })).toHaveLength(0);
      first.unmount();

      render(<LastSlotsStrip {...base} />);
      await click(screen.getByRole("button", { name: doorName("3") }));
      expect(screen.queryAllByRole("checkbox", { checked: true })).toHaveLength(0);
    });

    it("keeps the candidates the player declined declined", async () => {
      const first = render(<LastSlotsStrip {...base} />);
      await click(screen.getByRole("button", { name: doorName("3") }));
      const rowsBefore = screen.getAllByRole("checkbox").length;
      await click(screen.getAllByRole("button", { name: topOffCopy.list.declineAria("buy-1") })[0]);
      expect(screen.getAllByRole("checkbox")).toHaveLength(rowsBefore - 1);
      first.unmount();

      render(<LastSlotsStrip {...base} />);
      await click(screen.getByRole("button", { name: doorName("3") }));
      expect(screen.getAllByRole("checkbox")).toHaveLength(rowsBefore - 1);
    });

    it("does not restore another deck's selection", async () => {
      const first = render(<LastSlotsStrip {...base} />);
      await click(screen.getByRole("button", { name: doorName("3") }));
      first.unmount();

      render(<LastSlotsStrip {...base} deckId="deck-2" />);
      await click(screen.getByRole("button", { name: doorName("3") }));
      // Seeded afresh, which a restored draft never is.
      expect(actions.chooseBulk).toHaveBeenCalledTimes(2);
      expect(screen.getAllByRole("checkbox", { checked: true })).toHaveLength(2);
    });

    // What survives a reload is an *uncommitted* selection. A landed pass has
    // nothing left to survive, and a draft left behind would read as a choice
    // the player made — so the next open would seed nothing and hand a player
    // who still has slots an empty list.
    it("does not bring back a selection that has already been committed", async () => {
      const first = render(<LastSlotsStrip {...base} />);
      await click(screen.getByRole("button", { name: doorName("3") }));
      await click(screen.getByRole("button", { name: /^Add 2 cards to the deck/ }));
      expect(actions.commit).toHaveBeenCalled();
      first.unmount();

      render(<LastSlotsStrip {...base} />);
      await click(screen.getByRole("button", { name: doorName("3") }));
      expect(screen.getAllByRole("checkbox", { checked: true })).toHaveLength(2);
    });

    // A refusal changed nothing, so it is not a landed pass: the selection the
    // player is about to retry has to still be there when they come back.
    it("brings back a selection the server refused", async () => {
      actions.commit.mockResolvedValue({ ok: false, message: "Nope." });
      const first = render(<LastSlotsStrip {...base} />);
      await click(screen.getByRole("button", { name: doorName("3") }));
      await click(screen.getAllByRole("checkbox", { checked: true })[0]);
      await click(screen.getByRole("button", { name: /^Add 1 card to the deck/ }));
      first.unmount();

      render(<LastSlotsStrip {...base} />);
      await click(screen.getByRole("button", { name: doorName("3") }));
      expect(screen.getAllByRole("checkbox", { checked: true })).toHaveLength(1);
    });

    // The second half of the same loss: the deck open in two tabs at once.
    it("settles when the other tab changes the selection", async () => {
      render(<LastSlotsStrip {...base} />);
      await click(screen.getByRole("button", { name: doorName("3") }));
      expect(screen.getAllByRole("checkbox", { checked: true })).toHaveLength(2);

      const key = topOffDraftKey(base.deckId);
      await act(async () => {
        localStorage.setItem(key, '{"v":2,"t":["owned-1"],"d":[]}');
        window.dispatchEvent(new StorageEvent("storage", { key }));
      });
      expect(screen.getAllByRole("checkbox", { checked: true })).toHaveLength(1);
    });
  });
});
