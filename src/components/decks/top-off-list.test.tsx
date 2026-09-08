import { act, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { topOffCopy } from "../../lib/copy/top-off";
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
  onClose?: (r: "cancel" | "committed") => void;
}) {
  const [ticked, setTicked] = useState<Set<string>>(new Set(initialTicked));
  const [declined, setDeclined] = useState<Set<string>>(new Set(initialDeclined));
  return (
    <TopOffList
      deckId="deck-1"
      listId="list-1"
      openSlots={props.openSlots ?? 3}
      candidates={props.candidates ?? candidates}
      deckOracleIds={props.deckOracleIds ?? new Set()}
      ticked={ticked}
      onTickedChange={setTicked}
      declined={declined}
      onDeclinedChange={setDeclined}
      newestAsOf={props.newestAsOf ?? null}
      onAnnounce={props.onAnnounce ?? (() => {})}
      onInflight={props.onInflight ?? (() => {})}
      onClose={props.onClose ?? (() => {})}
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
});

describe("TopOffList", () => {
  // The cap is a property of the selection, not of the pool: every row is still
  // drawn, and the ones that cannot be ticked say why through the cap line.
  it("makes untouched rows inert at the cap and names the reason", async () => {
    render(<Harness openSlots={1} initialTicked={["owned-1"]} />);

    expect(screen.getByText(topOffCopy.list.cap("1"))).toBeInTheDocument();
    const other = rowBox("owned-2");
    expect(other).toHaveAttribute("aria-disabled", "true");
    expect(other).toHaveAttribute("aria-describedby", "list-1-cap");

    await click(other);
    expect(other).not.toBeChecked();
  });

  it("lets a ticked row untick at the cap", async () => {
    render(<Harness openSlots={1} initialTicked={["owned-1"]} />);
    await click(rowBox("owned-1"));
    expect(screen.queryByText(topOffCopy.list.cap("1"))).toBeNull();
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

    await click(screen.getByRole("button", { name: topOffCopy.commit.addAria("2", "98") }));

    expect(actions.commit).toHaveBeenCalledWith("deck-1", ["owned-1", "owned-2"]);
    expect(onAnnounce).toHaveBeenLastCalledWith(topOffCopy.announce.addedNoBuy("2", "98"));
    expect(onClose).toHaveBeenCalledWith("committed");
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

    await click(screen.getByRole("button", { name: topOffCopy.commit.addAria("1", "97") }));

    expect(onAnnounce).toHaveBeenLastCalledWith(topOffCopy.announce.added("1", "97", "1"));
  });

  // State 15. The refusal changed nothing, so it takes nothing away: every tick
  // survives and the list stays open for a second attempt.
  it("keeps every tick and stays open when the commit is refused", async () => {
    actions.commit.mockResolvedValue({ ok: false, message: "Deck is full." });
    const onClose = vi.fn();
    const onAnnounce = vi.fn();
    render(<Harness initialTicked={["owned-1", "owned-2"]} onClose={onClose} onAnnounce={onAnnounce} />);

    await click(screen.getByRole("button", { name: topOffCopy.commit.addAria("2", "98") }));

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

    await click(screen.getByRole("button", { name: topOffCopy.commit.addAria("1", "97") }));

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
    expect(screen.getByText(topOffCopy.list.cap("1"))).toBeInTheDocument();
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

    await click(screen.getByRole("button", { name: topOffCopy.commit.addAria("1", "97") }));

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
});
