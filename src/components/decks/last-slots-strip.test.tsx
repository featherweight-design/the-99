import { act, render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { synergyCopy } from "../../lib/copy/synergy-discovery";
import { topOffCopy } from "../../lib/copy/top-off";
import type { TopOffCandidate } from "../../lib/decks/last-slots";

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

  it("names the owned candidates in the door note before any pass", () => {
    render(<LastSlotsStrip {...base} />);
    expect(screen.getByText(topOffCopy.strip.doorNote("2"))).toBeInTheDocument();
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
  // nowhere else to put. Desktop keeps its one caption at both states.
  it("swaps the phone caption for the ordering once the list is open", async () => {
    render(<LastSlotsStrip {...base} />);
    expect(screen.getByText(topOffCopy.strip.captionMobile("3", "3"))).toBeInTheDocument();

    await click(screen.getByRole("button", { name: doorName("3") }));

    expect(screen.queryByText(topOffCopy.strip.captionMobile("3", "3"))).toBeNull();
    expect(screen.getByText(topOffCopy.strip.captionMobileOpen("3"))).toBeInTheDocument();
    expect(screen.getByText(topOffCopy.strip.caption("3", "3"))).toBeInTheDocument();
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

  // §1e — focus moves on close and only on close. The door does not exist at
  // the moment close is asked for, so the move has to wait for the render that
  // puts it back; a synchronous focus() here would silently do nothing.
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

  // The door note is about what the player just did. Before a pass it counts
  // what they own; after one it describes the pool they can come back to.
  it("changes the door note once a pass has landed", async () => {
    render(<LastSlotsStrip {...base} />);
    await click(screen.getByRole("button", { name: doorName("3") }));
    await click(screen.getByRole("button", { name: topOffCopy.commit.addAria("2", "98") }));

    expect(await screen.findByText(topOffCopy.strip.doorNoteAgainOwned("2", "3"))).toBeInTheDocument();
    expect(screen.queryByText(topOffCopy.strip.doorNote("2"))).toBeNull();
  });

  // Cancelling is not a pass. The note must not claim one happened.
  it("keeps the first-open door note when the list is only cancelled", async () => {
    render(<LastSlotsStrip {...base} />);
    await click(screen.getByRole("button", { name: doorName("3") }));
    await click(screen.getByRole("button", { name: topOffCopy.strip.close }));

    expect(screen.getByText(topOffCopy.strip.doorNote("2"))).toBeInTheDocument();
  });
});
