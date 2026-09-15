import { act, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { topOffCopy } from "../../lib/copy/top-off";
import { stubViewport } from "../../test-utils/stub-viewport";
import type { TopOffCandidate } from "../../lib/decks/last-slots";

const actions = vi.hoisted(() => ({ commit: vi.fn() }));
vi.mock("../../app/decks/actions", () => ({ commitTopOff: actions.commit }));

import { TopOffList } from "./top-off-list";

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

/** The price feed's newest as-of, so a priced fixture reads as current. */
const NOW = new Date("2026-09-08T09:00:00Z");

const candidates = [
  candidate("owned-1", true),
  candidate("owned-2", true),
  candidate("buy-1", false),
];

/** The selection lives in the strip, so every test needs a holder for it. */
function Harness({
  initialTicked = [],
  initialDeclined = [],
  ...props
}: {
  initialTicked?: string[];
  initialDeclined?: string[];
  openSlots?: number;
  candidates?: TopOffCandidate[];
  deckOracleIds?: Set<string>;
  newestAsOf?: Date | null;
  onAnnounce?: (m: string) => void;
  onInflight?: (v: boolean) => void;
  onCommitted?: () => void;
  onClose?: () => void;
  onBarHeight?: (h: number) => void;
}) {
  const [ticked, setTicked] = useState<Set<string>>(new Set(initialTicked));
  const [declined, setDeclined] = useState<Set<string>>(new Set(initialDeclined));
  return (
    <TopOffList
      deckId="deck-1"
      listId="list-1"
      openSlots={props.openSlots ?? 3}
      // Every case here is a single-commander deck.
      bodySize={99}
      candidates={props.candidates ?? candidates}
      deckOracleIds={props.deckOracleIds ?? new Set()}
      ticked={ticked}
      onTickedChange={setTicked}
      declined={declined}
      onDeclinedChange={setDeclined}
      newestAsOf={props.newestAsOf ?? null}
      onAnnounce={props.onAnnounce ?? (() => {})}
      onInflight={props.onInflight ?? (() => {})}
      // Both halves, as in production, where this is wired to the draft's
      // discard: a harness that dropped only the ticks would let a test pass on
      // declines the real surface has already forgotten.
      onCommitted={
        props.onCommitted ??
        (() => {
          setTicked(new Set());
          setDeclined(new Set());
        })
      }
      onClose={props.onClose ?? (() => {})}
      onBarHeight={props.onBarHeight ?? (() => {})}
    />
  );
}

async function click(el: HTMLElement) {
  await act(async () => {
    el.click();
  });
}

/** The row's accessible name opens with the spoken cost, so it is matched on
 *  the card name rather than anchored. */
const rowBox = (name: string) =>
  screen.getByRole("checkbox", { name: new RegExp(`${name}\\.`) });

beforeEach(() => {
  actions.commit
    .mockReset()
    .mockResolvedValue({ ok: true, added: 2, total: 98, passId: "p1", boughtDelta: 0 });
});

afterEach(() => {
  vi.useRealTimers();
  // The width tests spy on matchMedia, and a leaked spy would put every later
  // test in this file on whichever branch the last resize left behind.
  vi.restoreAllMocks();
});

describe("TopOffList", () => {
  // The cap is a property of the selection, not of the pool: every row is still
  // drawn, and the ones that cannot be ticked say why through the cap line.
  it("makes untouched rows inert at the cap and names the reason", async () => {
    render(<Harness openSlots={1} initialTicked={["owned-1"]} />);

    expect(screen.getByText(topOffCopy.list.cap)).toBeInTheDocument();
    const other = rowBox("owned-2");
    expect(other).toHaveAttribute("aria-disabled", "true");
    expect(other).toHaveAttribute("aria-describedby", "list-1-cap");

    await click(other);
    expect(other).not.toBeChecked();
  });

  it("lets a ticked row untick at the cap", async () => {
    render(<Harness openSlots={1} initialTicked={["owned-1"]} />);
    await click(rowBox("owned-1"));
    expect(screen.queryByText(topOffCopy.list.cap)).toBeNull();
  });

  // State 17. A quick-add lands while the list is open: the row keeps its slot
  // and says which rule caught it rather than vanishing under the cursor.
  it("freezes a row the deck gained while open, and drops its tick", () => {
    render(
      <Harness initialTicked={["owned-1", "owned-2"]} deckOracleIds={new Set(["owned-1"])} />,
    );

    expect(screen.getByText(topOffCopy.list.illegalInDeck)).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /owned-1\./ })).toBeNull();
    // One tick survives, so the count reads one — never the stale two.
    expect(screen.getByText(topOffCopy.list.headMobile("1", "3"))).toBeInTheDocument();
  });

  // The server payload that follows a quick-add drops the card from the pool
  // outright. The row still has to keep its slot: the frozen list is the pool
  // as it stood at the open, not the pool as the route last described it.
  it("keeps a frozen row when the fresh candidate list stops offering it", () => {
    const { rerender } = render(<Harness initialTicked={["owned-1", "owned-2"]} />);
    rerender(
      <Harness
        initialTicked={["owned-1", "owned-2"]}
        candidates={candidates.filter((c) => c.oracleId !== "owned-1")}
        deckOracleIds={new Set(["owned-1"])}
      />,
    );

    expect(screen.getByText(topOffCopy.list.illegalInDeck)).toBeInTheDocument();
    expect(screen.getByText(topOffCopy.list.headMobile("1", "3"))).toBeInTheDocument();
  });

  // The two reasons a row goes illegal mean different things, and the frozen row
  // exists to say which. A card that left the list without entering the deck
  // left because the identity moved under it.
  it("names the colour reason for a row that left the list without entering the deck", () => {
    const { rerender } = render(<Harness initialTicked={["owned-1"]} />);
    rerender(
      <Harness
        initialTicked={["owned-1"]}
        candidates={candidates.filter((c) => c.oracleId !== "owned-1")}
      />,
    );

    expect(screen.getByText(topOffCopy.list.illegalColour)).toBeInTheDocument();
    expect(screen.queryByText(topOffCopy.list.illegalInDeck)).toBeNull();
  });

  // src/lib/copy/price.ts: silence is a state. A card the feed has never
  // stocked is not free and not an error, so neither the spoken row nor the
  // commit bar reaches for a figure it does not have.
  it("says nothing about money when the buy rows have no price", async () => {
    render(<Harness candidates={[candidate("buy-1", false)]} />);

    expect(rowBox("buy-1")).toHaveAccessibleName(/Not in your collection\./);
    await click(rowBox("buy-1"));

    expect(screen.getByText(topOffCopy.commit.toBuy("1", null))).toBeInTheDocument();
    expect(screen.queryByText(/\$0\.00/)).toBeNull();
  });

  it("prints the total once a buy row is priced", async () => {
    const priced = {
      ...candidate("buy-1", false),
      price: { cents: 1240, foilCents: null, etchedCents: null, asOf: NOW },
    };
    render(<Harness candidates={[priced]} newestAsOf={NOW} />);

    await click(rowBox("buy-1"));

    expect(
      screen.getByText(topOffCopy.commit.toBuy("1", "$12.40")),
    ).toBeInTheDocument();
  });

  // A failed availability read draws no marker, so it must not speak a count
  // either: "×1 in your collection" to a player holding four is worse than
  // saying nothing about how many.
  it("drops the owned count from the row's name when availability is missing", () => {
    render(<Harness candidates={[candidate("owned-1", true)]} />);

    const box = rowBox("owned-1");
    expect(box).toHaveAccessibleName(/Owned\./);
    expect(box).not.toHaveAccessibleName(/×1 in your collection/);
  });

  // State 7. The decline is reversible and says so in the same breath as the
  // count it changed.
  it("declines a row, announces it, and restores it", async () => {
    const onAnnounce = vi.fn();
    render(<Harness initialTicked={["owned-1"]} onAnnounce={onAnnounce} />);

    await click(screen.getByRole("button", { name: topOffCopy.list.declineAria("owned-1") }));

    expect(screen.getByText(topOffCopy.list.declined)).toBeInTheDocument();
    expect(onAnnounce).toHaveBeenCalledWith(topOffCopy.announce.declined("owned-1", "0", "3"));

    await click(screen.getByRole("button", { name: topOffCopy.list.restoreAria("owned-1") }));
    expect(screen.queryByText(topOffCopy.list.declined)).toBeNull();
    expect(rowBox("owned-1")).toBeInTheDocument();
  });

  // Zero ticks is two different states, and the sentence that blames the
  // collection must only print when the collection is genuinely empty of these.
  it("branches the zero-tick line on whether anything here is owned", () => {
    const { unmount } = render(<Harness />);
    expect(screen.getByText(topOffCopy.commit.nothingTicked)).toBeInTheDocument();
    unmount();

    render(<Harness candidates={[candidate("buy-1", false)]} />);
    expect(
      screen.getByText(topOffCopy.commit.nothingTickedUnowned("1")),
    ).toBeInTheDocument();
  });

  // The strip owns the declines and they outlive every close, while the pool is
  // refrozen on each open. A card declined once and gone from the route by the
  // next open must not be subtracted from a pool it is not in.
  it("counts only the declines this opening can see", () => {
    render(
      <Harness
        candidates={[candidate("owned-1", true), candidate("owned-2", true)]}
        initialDeclined={["owned-1", "gone-from-the-route"]}
      />,
    );

    // Two candidates, one of them declined here, nothing ticked. The head is
    // drawn in two spans, so the static half is what carries the count.
    const [, statics] = topOffCopy.list.head("0", "3", "2", "1").split(" · ");
    expect(screen.getByText(statics, { exact: false })).toBeInTheDocument();
  });

  // An aria-label replaces the visible label rather than annotating it, so at
  // zero the accessible name must lose the count too. Announcing "Add 0 cards"
  // over a button that reads "Add cards" is two different buttons.
  it("drops the count from the commit button's accessible name at zero ticks", () => {
    render(<Harness />);
    expect(
      screen.getByRole("button", { name: topOffCopy.commit.addEmpty }),
    ).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Add 0 cards/ })).toBeNull();
  });

  it("commits exactly the live ticks and closes on success", async () => {
    const onClose = vi.fn();
    const onAnnounce = vi.fn();
    const onInflight = vi.fn();
    render(
      <Harness
        initialTicked={["owned-1", "owned-2"]}
        onClose={onClose}
        onAnnounce={onAnnounce}
        onInflight={onInflight}
      />,
    );

    await click(screen.getByRole("button", { name: topOffCopy.commit.addAria("2", "98", 99) }));

    expect(actions.commit).toHaveBeenCalledWith("deck-1", ["owned-1", "owned-2"]);
    expect(onAnnounce).toHaveBeenLastCalledWith(topOffCopy.announce.addedNoBuy("2", "98", 99));
    expect(onClose).toHaveBeenCalled();
    expect(onInflight.mock.calls.map((c) => c[0])).toEqual([true, false]);
  });

  it("names the money in the announcement when the pass bought something", async () => {
    actions.commit.mockResolvedValue({
      ok: true,
      added: 1,
      total: 97,
      passId: "p1",
      boughtDelta: 1,
    });
    const onAnnounce = vi.fn();
    render(<Harness initialTicked={["buy-1"]} onAnnounce={onAnnounce} />);

    await click(screen.getByRole("button", { name: topOffCopy.commit.addAria("1", "97", 99) }));

    expect(onAnnounce).toHaveBeenLastCalledWith(topOffCopy.announce.added("1", "97", "1", 99));
  });

  // State 15. The refusal changed nothing, so it takes nothing away: every tick
  // survives and the list stays open for a second attempt.
  it("keeps every tick and stays open when the commit is refused", async () => {
    actions.commit.mockResolvedValue({ ok: false, message: "Deck is full." });
    const onClose = vi.fn();
    const onAnnounce = vi.fn();
    render(<Harness initialTicked={["owned-1", "owned-2"]} onClose={onClose} onAnnounce={onAnnounce} />);

    await click(screen.getByRole("button", { name: topOffCopy.commit.addAria("2", "98", 99) }));

    // Drawn and spoken once each, in the same words. The plate carries no live
    // role, because BuilderShell's polite region is what speaks here.
    expect(screen.getByTestId("top-off-refusal")).toHaveTextContent("Deck is full.");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(onAnnounce).toHaveBeenLastCalledWith("Deck is full.");
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getAllByRole("checkbox", { checked: true })).toHaveLength(2);
  });

  // A call that never arrived and one that arrived and failed are the same
  // event to the player.
  it("draws the same refusal when the call itself throws", async () => {
    actions.commit.mockRejectedValue(new Error("network"));
    const onAnnounce = vi.fn();
    render(<Harness initialTicked={["owned-1"]} onAnnounce={onAnnounce} />);

    await click(screen.getByRole("button", { name: topOffCopy.commit.addAria("1", "97", 99) }));

    expect(screen.getByTestId("top-off-refusal")).toHaveTextContent(topOffCopy.commit.refused);
    // A thrown call has no reason of its own, so both paths fall to the same
    // sentence here, and it is still said once.
    expect(onAnnounce).toHaveBeenLastCalledWith(topOffCopy.commit.refused);
  });

  // The cap moves while the list is open — a quick-add of a card that is not
  // itself a candidate takes a slot and unticks nothing. The count must follow
  // the new cap rather than report an impossible "2 of 1".
  it("clamps the selection when open slots shrink under it", () => {
    const { rerender } = render(
      <Harness openSlots={2} initialTicked={["owned-1", "owned-2"]} />,
    );
    expect(screen.getByText(topOffCopy.list.headMobile("2", "2"))).toBeInTheDocument();

    rerender(<Harness openSlots={1} initialTicked={["owned-1", "owned-2"]} />);

    expect(screen.getByText(topOffCopy.list.headMobile("1", "1"))).toBeInTheDocument();
    expect(screen.getByText(topOffCopy.list.cap)).toBeInTheDocument();
    // The survivor is the higher-ranked row; the tick lost is the last one made.
    expect(rowBox("owned-1")).toBeChecked();
    expect(rowBox("owned-2")).not.toBeChecked();
  });

  it("holds the in-flight label and locks the row controls while writing", async () => {
    let settle: (v: unknown) => void = () => {};
    actions.commit.mockReturnValue(
      new Promise((resolve) => {
        settle = resolve;
      }),
    );
    render(<Harness initialTicked={["owned-1"]} />);

    await click(screen.getByRole("button", { name: topOffCopy.commit.addAria("1", "97", 99) }));

    expect(screen.getByText(topOffCopy.commit.inFlight("1"))).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: topOffCopy.commit.cancel }),
    ).toBeDisabled();

    await act(async () => {
      settle({ ok: true, added: 1, total: 97, passId: "p1", boughtDelta: 0 });
    });
    expect(screen.queryByText(topOffCopy.commit.inFlight("1"))).toBeNull();
  });

  // Thirty fast taps is one message, which is the shipped selection rule.
  it("announces the selection once per settle, not once per tick", async () => {
    vi.useFakeTimers();
    const onAnnounce = vi.fn();
    render(<Harness onAnnounce={onAnnounce} />);

    // Separate acts: a toggle reads the selection its own render was given, so
    // two clicks in one batch would be one tick, not two.
    await act(async () => {
      rowBox("owned-1").click();
    });
    await act(async () => {
      rowBox("owned-2").click();
    });
    expect(onAnnounce).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    expect(onAnnounce).toHaveBeenCalledTimes(1);
    expect(onAnnounce).toHaveBeenCalledWith(topOffCopy.announce.tickedNoBuy("2", "3"));
  });

  // The tick-all clamps to the open slots, so a player owning more candidates
  // than there are slots must be offered the number it will actually tick —
  // a button that says two and ticks one is wrong on its face and in its name.
  it("names the tick-all by what it will tick, not by what is owned", async () => {
    render(<Harness openSlots={1} />);

    const button = screen.getByRole("button", {
      name: topOffCopy.list.tickOwnedAria("1"),
    });
    expect(button).toHaveTextContent(topOffCopy.list.tickOwned("1"));

    await click(button);
    expect(screen.getByText(topOffCopy.list.headMobile("1", "1"))).toBeInTheDocument();
  });

  // A decline speaks for itself immediately, and it also moves the count, which
  // would otherwise bring the settle effect along 600ms later saying the same
  // act a second time in different words.
  it("speaks a decline once, not again when the selection settles", async () => {
    vi.useFakeTimers();
    const onAnnounce = vi.fn();
    render(<Harness initialTicked={["owned-1"]} onAnnounce={onAnnounce} />);

    await click(screen.getByRole("button", { name: topOffCopy.list.declineAria("owned-1") }));
    expect(onAnnounce).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    expect(onAnnounce).toHaveBeenCalledTimes(1);
    expect(onAnnounce).toHaveBeenCalledWith(topOffCopy.announce.declined("owned-1", "0", "3"));
  });

  // Declining a row nobody ticked does not move the count, so there is no
  // duplicate to suppress — and suppressing anyway would swallow the next real
  // settle instead.
  it("keeps the next settle after declining a row that was never ticked", async () => {
    vi.useFakeTimers();
    const onAnnounce = vi.fn();
    render(<Harness onAnnounce={onAnnounce} />);

    await click(screen.getByRole("button", { name: topOffCopy.list.declineAria("owned-1") }));
    await act(async () => {
      rowBox("owned-2").click();
    });
    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(onAnnounce).toHaveBeenLastCalledWith(topOffCopy.announce.tickedNoBuy("1", "3"));
  });

  it("announces the cap rather than the count once the last slot is ticked", async () => {
    vi.useFakeTimers();
    const onAnnounce = vi.fn();
    render(<Harness openSlots={1} onAnnounce={onAnnounce} />);

    await act(async () => {
      rowBox("owned-1").click();
    });
    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(onAnnounce).toHaveBeenCalledWith(topOffCopy.announce.capped("1"));
  });

  // #478. The deck row's remove is a visually identical × one surface away and
  // it is irreversible, so this control is a word and never a glyph.
  it("draws the decline as a word in its own tab stop, outside the tick label", async () => {
    render(<Harness candidates={[candidate("owned-1", true)]} />);

    const control = screen.getByRole("button", {
      name: topOffCopy.list.declineAria("owned-1"),
    });
    expect(control).toHaveTextContent(topOffCopy.list.decline);
    expect(control.closest("label")).toBeNull();

    // The whole point of the seam: declining must not also toggle the tick.
    await click(control);
    expect(screen.getByText(topOffCopy.list.declined)).toBeInTheDocument();
  });

  // S25. Declines survive every close, so 38 of them left the only way back as
  // 38 individual taps.
  it("offers the bulk restore from the first decline and returns the rows unticked", async () => {
    const onAnnounce = vi.fn();
    render(<Harness initialTicked={["owned-1"]} onAnnounce={onAnnounce} />);

    expect(screen.queryByText(topOffCopy.list.restoreAll("1"))).toBeNull();

    await click(screen.getByRole("button", { name: topOffCopy.list.declineAria("owned-1") }));
    await click(screen.getByRole("button", { name: topOffCopy.list.declineAria("owned-2") }));

    const restoreAll = screen.getByRole("button", {
      name: topOffCopy.list.restoreAllAria("2"),
    });
    expect(restoreAll).toHaveTextContent(topOffCopy.list.restoreAll("2"));

    await click(restoreAll);
    expect(screen.queryByText(topOffCopy.list.declined)).toBeNull();
    expect(rowBox("owned-1")).not.toBeChecked();
    expect(onAnnounce).toHaveBeenLastCalledWith(topOffCopy.announce.restoredAll("2", "0", "3"));
  });

  // Emptied by choosing is not empty. The shipped line says the list arrives
  // with what you own already ticked, which by now describes a moment that has
  // passed — and state 13's `your collection ran out` would blame the
  // collection for the player's own preferences.
  it("names the all-declined state rather than repeating the arrival line", async () => {
    render(<Harness candidates={[candidate("owned-1", true)]} />);
    expect(screen.getByText(topOffCopy.commit.nothingTicked)).toBeInTheDocument();

    await click(screen.getByRole("button", { name: topOffCopy.list.declineAria("owned-1") }));

    expect(
      screen.getByText(topOffCopy.commit.nothingTickedAllDeclined("1")),
    ).toBeInTheDocument();
    expect(screen.queryByText(topOffCopy.commit.nothingTicked)).toBeNull();
  });

  // The bar has one status line and cannot be allowed to grow a second. The two
  // rungs partition every state between them, which is why the addendum's third
  // one — the dock notice it ranks last — renders in neither case here.
  it("prints exactly one status line at phone, in ladder order", async () => {
    const { unmount } = render(<Harness openSlots={1} initialTicked={["owned-1"]} />);
    expect(screen.getByText(topOffCopy.list.cap)).toBeInTheDocument();
    expect(screen.queryByText(topOffCopy.dock.retired)).toBeNull();
    expect(screen.queryByText(topOffCopy.commit.slotsStayOpen("1"))).toBeNull();
    unmount();

    render(<Harness openSlots={3} initialTicked={["owned-1"]} />);
    expect(screen.getByText(topOffCopy.commit.slotsStayOpen("2"))).toBeInTheDocument();
    expect(screen.queryByText(topOffCopy.list.cap)).toBeNull();
    expect(screen.queryByText(topOffCopy.dock.retired)).toBeNull();
  });

  // The cap line has two homes and one id. Two elements cannot share it, so the
  // width picks which one mounts — and the inert boxes describe whichever it is.
  it("keeps one cap line and one id when the width moves it to the head", async () => {
    const viewport = stubViewport(390);
    const { rerender } = render(<Harness openSlots={1} initialTicked={["owned-1"]} />);

    expect(screen.getAllByText(topOffCopy.list.cap)).toHaveLength(1);
    expect(rowBox("owned-2")).toHaveAttribute("aria-describedby", "list-1-cap");

    await act(async () => {
      viewport.resizeTo(1280);
    });
    rerender(<Harness openSlots={1} initialTicked={["owned-1"]} />);

    expect(screen.getAllByText(topOffCopy.list.cap)).toHaveLength(1);
    expect(document.getElementById("list-1-cap")).toHaveTextContent(topOffCopy.list.cap);
  });
});

// A modal DFC whose front is a land and whose back is a spell stores
// `" // {3}{R}"` — non-null, and a cost this row never draws, because the pips
// read the front half. The track must stay unmounted for it: mounted, the phone
// row gains the track's own gap ahead of the score with nothing inside it.
describe("TopOffList — a cost that belongs to the back face", () => {
  const backOnly = [
    { ...candidate("owned-1", true), manaCost: " // {3}{R}" },
    { ...candidate("owned-2", true), manaCost: "{1}{R}" },
  ];

  /** The row's own element, from the checkbox that names it. */
  const rowOf = (name: string) => rowBox(name).closest("li") ?? rowBox(name).parentElement;

  it("mounts no cost track for it, and still mounts one for a costed row", () => {
    render(<Harness candidates={backOnly} />);

    // Asserted per ROW rather than by counting: the list mounts a phone tree and
    // a desktop tree, so a total is a number about the harness rather than about
    // either card.
    expect(rowOf("owned-1")?.querySelector("[class*='md:order-3']")).toBeNull();
    expect(rowOf("owned-2")?.querySelector("[class*='md:order-3']")).not.toBeNull();
  });
});
