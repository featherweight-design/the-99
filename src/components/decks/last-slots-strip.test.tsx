import { act, render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { synergyCopy } from "../../lib/copy/synergy-discovery";
import { topOffCopy } from "../../lib/copy/top-off";
import type { TopOffCandidate } from "../../lib/decks/last-slots";
import { topOffDraftKey } from "../../lib/decks/top-off-draft";

const actions = vi.hoisted(() => ({ commit: vi.fn() }));
vi.mock("../../app/decks/actions", () => ({ commitTopOff: actions.commit }));

import { LastSlotsStrip } from "./last-slots-strip";

function candidate(id: string, owned: boolean): TopOffCandidate {
  return {
    oracleId: id,
    name: id,
    typeLine: "Instant",
    facet: "spell",
    inclusionPct: 40,
    synergyPts: 20,
    owned,
    committedTo: null,
    manaCost: null,
    price: null,
    availability: null,
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
});

describe("LastSlotsStrip", () => {
  // States 10 and 14. The strip is arithmetic, not a flag: a full deck has no
  // last slots, so there is no box to draw around them.
  it("renders nothing at all when there are no open slots", () => {
    const { container } = render(<LastSlotsStrip {...base} openSlots={0} />);
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

  it("names the owned candidates in the door note before any pass", () => {
    render(<LastSlotsStrip {...base} />);
    expect(screen.getByText(topOffCopy.strip.doorNote("2"))).toBeInTheDocument();
  });

  // The note promises what will arrive ticked, and the seed clamps to the open
  // slots. Two owned candidates for one slot arrives as one tick, so promising
  // two is a promise the open cannot keep.
  it("clamps the door note's promise to the slots the seed can fill", () => {
    render(<LastSlotsStrip {...base} openSlots={1} />);
    expect(screen.getByText(topOffCopy.strip.doorNote("1"))).toBeInTheDocument();
    expect(screen.queryByText(topOffCopy.strip.doorNote("2"))).toBeNull();
  });

  // A player who owns none of the candidates seeds no ticks, and the note has
  // to say that rather than counting zero of them.
  it("says the list arrives untouched when nothing in the pool is owned", () => {
    render(
      <LastSlotsStrip {...base} candidates={[candidate("buy-1", false), candidate("buy-2", false)]} />,
    );
    expect(screen.getByText(topOffCopy.strip.doorNote("0"))).toBeInTheDocument();
    // Asserting the rendered key alone cannot see a missing zero branch, since
    // both sides of the comparison come from the same function.
    expect(topOffCopy.strip.doorNote("0")).not.toMatch(/^0 /);
  });

  // State 13. A control with nothing to do is absent, not disabled — and the
  // caption goes with it rather than counting a pool of zero.
  it("replaces the door and the caption with the exhausted line when the pool is empty", () => {
    render(<LastSlotsStrip {...base} candidates={[]} />);
    expect(screen.getByTestId("last-slots-exhausted")).toHaveTextContent(
      synergyCopy.lastSlots.short("96", "3"),
    );
    expect(screen.queryByRole("button", { name: doorName("3") })).toBeNull();
    expect(screen.queryByText(topOffCopy.strip.caption("3", "0"))).toBeNull();
  });

  // A card owned with every copy sleeved in another deck is offered, and rightly
  // — the player may still reclaim one. What it must not do is arrive PRE-TICKED,
  // where it is indistinguishable from a card they can sleeve tonight and
  // committing it costs either a purchase or a card out of another deck. That is
  // the act the list draws a buy tag for, made silently on their behalf.
  const claimed = (id: string): TopOffCandidate => ({
    ...candidate(id, true),
    availability: { owned: 1, hard: 1, soft: 0, free: 0, claims: [] },
  });
  const spare = (id: string): TopOffCandidate => ({
    ...candidate(id, true),
    availability: { owned: 2, hard: 1, soft: 0, free: 1, claims: [] },
  });

  it("promises only the owned cards it can actually seed", () => {
    render(
      <LastSlotsStrip {...base} candidates={[claimed("held-1"), claimed("held-2"), spare("free-1")]} />,
    );

    // One, not three: the note states what will arrive ticked, so it reads the
    // same list the seed does or it overstates by exactly the cards whose every
    // copy is sleeved elsewhere.
    expect(screen.getByText(topOffCopy.strip.doorNote("1"))).toBeInTheDocument();
    expect(screen.queryByText(topOffCopy.strip.doorNote("3"))).toBeNull();
  });

  it("does not tell a player who owns every candidate that they own none", () => {
    // A seed of zero is two opposite facts now. `doorNote`'s zero branch says
    // `You own none of these`, which is false when the player owns all of them
    // and every copy is sleeved in another deck — and false to the player best
    // placed to notice. The OWNED count picks between them, never the seed.
    render(<LastSlotsStrip {...base} candidates={[claimed("held-1"), claimed("held-2")]} />);

    expect(screen.getByText(topOffCopy.strip.doorNoteNoneFree)).toBeInTheDocument();
    expect(screen.queryByText(topOffCopy.strip.doorNote("0"))).toBeNull();
  });

  it("still says `you own none` when the player really owns none", () => {
    render(<LastSlotsStrip {...base} candidates={[candidate("buy-1", false)]} />);

    expect(screen.getByText(topOffCopy.strip.doorNote("0"))).toBeInTheDocument();
    expect(screen.queryByText(topOffCopy.strip.doorNoteNoneFree)).toBeNull();
  });

  it("seeds a card with no availability reading, which is the degraded case", () => {
    // A null reading is NO ROW — an unowned card, or a read that could not reach
    // — and reads as free everywhere else in the app. Seeding nothing here would
    // let one failed read silently empty the promise the strip makes.
    render(<LastSlotsStrip {...base} candidates={[candidate("unread", true)]} />);

    expect(screen.getByText(topOffCopy.strip.doorNote("1"))).toBeInTheDocument();
  });

  // §16 — an exhausted pool is honest, not alarming, so the plate carries the
  // provenance accent and never the warning colour. Asserted as longhands
  // because jsdom will not expand a shorthand whose value holds a var().
  it("draws the exhausted line in the provenance shape, not the warning one", () => {
    render(<LastSlotsStrip {...base} candidates={[]} />);
    expect(screen.getByTestId("last-slots-exhausted")).toHaveStyle({
      borderLeftWidth: "3px",
      borderLeftStyle: "solid",
      borderLeftColor: "var(--accent)",
    });
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

  // At 390px the open-slot figure is the commit bar's denominator, so the strip
  // caption stops repeating it and picks up the ordering, which phone has
  // nowhere else to put. Desktop drops the caption outright, because its list
  // head states both figures and the ordering line states the ordering.
  it("swaps the phone caption for the ordering once the list is open", async () => {
    render(<LastSlotsStrip {...base} />);
    expect(screen.getByText(topOffCopy.strip.captionMobile("3", "3"))).toBeInTheDocument();
    expect(screen.getByText(topOffCopy.strip.caption("3", "3"))).toBeInTheDocument();

    await click(screen.getByRole("button", { name: doorName("3") }));

    expect(screen.queryByText(topOffCopy.strip.captionMobile("3", "3"))).toBeNull();
    expect(screen.getByText(topOffCopy.strip.captionMobileOpen("3"))).toBeInTheDocument();
    expect(screen.queryByText(topOffCopy.strip.caption("3", "3"))).toBeNull();
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

  // The door unmounts under the cursor when the list opens, and a button that
  // unmounts drops focus to the body. Focus follows the disclosure to its other
  // face instead — never into the rows, which §1e rules out.
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
    expect(screen.queryByTestId("last-slots-exhausted")).toBeNull();
  });

  // §1e — focus moves on close and only on close. The door does not exist at
  // the moment close is asked for, so the move has to wait for the render that
  // puts it back; a synchronous focus() here would silently do nothing.
  // A pass that takes the last candidates leaves slots open and no door, so the
  // one close that ends the feature is the one with nothing to return to.
  it("returns focus to the exhausted plate when the pass emptied the pool", async () => {
    const { rerender } = render(<LastSlotsStrip {...base} />);
    await click(screen.getByRole("button", { name: doorName("3") }));

    rerender(<LastSlotsStrip {...base} candidates={[]} />);
    await click(screen.getByRole("button", { name: topOffCopy.strip.close }));

    expect(screen.getByTestId("last-slots-exhausted")).toHaveFocus();
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

  // The door note is about what the next open will do. Before the first one it
  // promises the seed; afterwards the seed has already run, so it describes the
  // pool and the selection the player can come back to.
  it("changes the door note once the list has been opened and committed", async () => {
    render(<LastSlotsStrip {...base} />);
    await click(screen.getByRole("button", { name: doorName("3") }));
    await click(screen.getByRole("button", { name: topOffCopy.commit.addAria("2", "98", 99) }));

    expect(await screen.findByText(topOffCopy.strip.doorNoteAgainOwned("2", "3"))).toBeInTheDocument();
    expect(screen.queryByText(topOffCopy.strip.doorNote("2"))).toBeNull();
  });

  // Cancelling adds nothing, but it does not discard the selection either: the
  // seed has run and the player's edits survive. So the note moves off the
  // first-open promise even though no pass landed, because promising a seed
  // that has already happened is the one thing it must not do.
  it("moves the door note off the first-open promise after a cancel", async () => {
    render(<LastSlotsStrip {...base} />);
    await click(screen.getByRole("button", { name: doorName("3") }));
    await click(screen.getByRole("button", { name: topOffCopy.strip.close }));

    expect(screen.getByText(topOffCopy.strip.doorNoteAgainOwned("2", "3"))).toBeInTheDocument();
    expect(screen.queryByText(topOffCopy.strip.doorNote("2"))).toBeNull();
  });

  // The strip is the last thing on the builder page, so at 390px the list opens
  // below the fold and the player is handed a commit bar with no card on screen.
  // Closing must not scroll: the door is already where the reader is looking.
  it("brings the panel into view when the list opens, and not when it closes", async () => {
    const scrollIntoView = vi.fn();
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = scrollIntoView;
    try {
      render(<LastSlotsStrip {...base} />);
      await click(screen.getByRole("button", { name: doorName("3") }));
      expect(scrollIntoView).toHaveBeenCalledWith({ block: "start" });

      scrollIntoView.mockClear();
      await click(screen.getByRole("button", { name: topOffCopy.strip.close }));
      expect(scrollIntoView).not.toHaveBeenCalled();
    } finally {
      Element.prototype.scrollIntoView = original;
    }
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

    // The door note promises what will arrive ticked. Once a selection
    // survives the reload, that promise is about a seed that already happened.
    it("greets a returning player with the reopen note, not the first-open one", async () => {
      const first = render(<LastSlotsStrip {...base} />);
      expect(screen.getByText(topOffCopy.strip.doorNote("2"))).toBeInTheDocument();
      await click(screen.getByRole("button", { name: doorName("3") }));
      await click(screen.getByRole("button", { name: topOffCopy.strip.close }));
      first.unmount();

      render(<LastSlotsStrip {...base} />);
      expect(screen.getByText(topOffCopy.strip.doorNoteAgainOwned("2", "3"))).toBeInTheDocument();
      expect(screen.queryByText(topOffCopy.strip.doorNote("2"))).toBeNull();
    });

    it("does not restore another deck's selection", async () => {
      const first = render(<LastSlotsStrip {...base} />);
      await click(screen.getByRole("button", { name: doorName("3") }));
      first.unmount();

      render(<LastSlotsStrip {...base} deckId="deck-2" />);
      expect(screen.getByText(topOffCopy.strip.doorNote("2"))).toBeInTheDocument();
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
      expect(screen.getByText(topOffCopy.strip.doorNote("2"))).toBeInTheDocument();
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
        localStorage.setItem(key, '{"t":["owned-1"],"d":[]}');
        window.dispatchEvent(new StorageEvent("storage", { key }));
      });
      expect(screen.getAllByRole("checkbox", { checked: true })).toHaveLength(1);
    });
  });
});
