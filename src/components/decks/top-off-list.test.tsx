import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { topOffCopy } from "../../lib/copy/top-off";
import { synergyCopy } from "../../lib/copy/synergy-discovery";
import { stubViewport } from "../../test-utils/stub-viewport";
import type { TopOffCandidate } from "../../lib/decks/last-slots";
import { CardDetailProvider, cardDetailCopy } from "../cards/card-detail-provider";

const actions = vi.hoisted(() => ({ commit: vi.fn(), chooseBulk: vi.fn() }));
vi.mock("../../app/decks/actions", () => ({
  commitTopOff: actions.commit,
  chooseBulkFill: actions.chooseBulk,
}));

import { TopOffList } from "./top-off-list";

function candidate(id: string, owned: boolean): TopOffCandidate {
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
  // The provider is a REQUIREMENT of the desktop row, not scaffolding: the name
  // is a `CardDetailTrigger`, and that throws outside a provider rather than
  // degrading. Production satisfies it — `builder-shell.tsx` wraps the strip at
  // line 851 inside the provider it opens at 711 — and this harness has to state
  // the same thing, or every desktop case here fails on the mount.
  return (
    <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
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
    </CardDetailProvider>
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
  // RESET TOO, or a `mockResolvedValue` set by one case answers every later one. A case that
  // presses the bulk control without stubbing it would inherit the previous case's ids rather
  // than `undefined`, and read as passing on an answer it never asked for.
  actions.chooseBulk.mockReset();
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
    // The action answers with the one slot's worth; the LABEL is computed from the list's own
    // `tickable` and is what this case is about.
    actions.chooseBulk.mockResolvedValue({ ok: true, oracleIds: ["owned-1"] });
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

describe("TopOffList — the bulk tick", () => {
  const claimed = (id: string): TopOffCandidate => ({
    ...candidate(id, true),
    availability: { owned: 1, hard: 1, soft: 0, free: 0, claims: [] },
  });

  it("reaches for what the seed reaches for, and says so", async () => {
    // The two drifted once already: the seed was narrowed to cards with a free
    // copy while this control kept ticking every owned card, which left a
    // one-click path to the exact mechanic the seed had stopped doing.
    // The ACTION decides what to tick now — the control no longer slices a synergy ranking —
    // so the case stubs its answer and asserts the control honours the list's own exclusions
    // on top of it. Offering a held card and choosing one are different things, and only the
    // second changed.
    actions.chooseBulk.mockResolvedValue({ ok: true, oracleIds: ["free-1", "held-1"] });
    render(<Harness candidates={[claimed("held-1"), candidate("free-1", true)]} />);

    const bulk = screen.getByRole("button", { name: topOffCopy.list.tickOwnedAria("1") });
    expect(bulk).toHaveTextContent(topOffCopy.list.tickOwned("1"));

    fireEvent.click(bulk);
    await screen.findByRole("button", { name: topOffCopy.list.tickOwnedAria("1") });
    const boxes = screen.getAllByRole("checkbox");
    const byName = (name: string) =>
      boxes.find((b) => (b.getAttribute("aria-label") ?? "").includes(name));
    expect(byName("free-1")).toBeChecked();
    expect(byName("held-1")).not.toBeChecked();
  });

  // A REFUSAL CHANGES NOTHING, which is the rule state 15 states for the commit beside this.
  // The handler used to hand `onTickedChange` an empty set on `ok: false`, throwing away every
  // tick the player had made by hand — and the empty set is a real value here, drawn by the
  // clear control, so it cannot double as a failure outcome. It dropped the message too.
  it("keeps the ticks and says why when the choice is refused", async () => {
    const onAnnounce = vi.fn();
    actions.chooseBulk.mockResolvedValue({ ok: false, message: "Couldn’t work that out." });
    render(<Harness
      candidates={[candidate("free-1", true), candidate("free-2", true)]}
      onAnnounce={onAnnounce}
    />);

    const box = screen.getAllByRole("checkbox")[0];
    fireEvent.click(box);
    expect(box).toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: /Tick all/ }));
    await screen.findByTestId("top-off-refusal");

    expect(screen.getByTestId("top-off-refusal")).toHaveTextContent("Couldn’t work that out.");
    expect(screen.getAllByRole("checkbox")[0]).toBeChecked();
    // `RefusalPlate` carries no live role, so drawing the message reaches sighted readers and
    // nobody else.
    expect(onAnnounce).toHaveBeenCalledWith("Couldn’t work that out.");
  });

  it("draws a refusal rather than going silent when the call throws", async () => {
    actions.chooseBulk.mockRejectedValue(new Error("network"));
    render(<Harness candidates={[candidate("free-1", true)]} />);

    fireEvent.click(screen.getByRole("button", { name: /Tick all/ }));
    await screen.findByTestId("top-off-refusal");

    expect(screen.getByTestId("top-off-refusal"))
      .toHaveTextContent(synergyCopy.lastSlots.topUpFailed);
  });

  // THE DRAFT MOVES WHILE THE SERVER THINKS. Row toggles, declines, clear and Cancel all stay
  // live during the request — they consult `inflight`, which is the COMMIT's — so a player can
  // set a row aside after pressing and before the answer lands. An allow-list captured before
  // the await describes a draft that no longer exists, and reviving that row is exactly the
  // undo-with-a-press this control is meant to avoid.
  it("applies the answer against the draft as it stands when it arrives", async () => {
    let release: (v: unknown) => void = () => {};
    actions.chooseBulk.mockReturnValue(new Promise((r) => { release = r; }));
    render(<Harness candidates={[candidate("free-1", true), candidate("free-2", true)]} />);

    fireEvent.click(screen.getByRole("button", { name: /Tick all/ }));

    // Set one aside AFTER the request is out and BEFORE it answers.
    fireEvent.click(screen.getByRole("button", {
      name: topOffCopy.list.declineAria("free-1"),
    }));

    await act(async () => {
      release({ ok: true, oracleIds: ["free-1", "free-2"] });
    });

    // RESTORED, because a declined row leaves the list either way and the question is what
    // the late answer wrote into the selection behind it. A stale tick is invisible until the
    // row comes back carrying it.
    fireEvent.click(screen.getByRole("button", {
      name: topOffCopy.list.restoreAria("free-1"),
    }));
    expect(rowBox("free-1")).not.toBeChecked();
  });

  // A NEWER SELECTION WINS. `onTickedChange` REPLACES the selection wholesale, so an answer
  // arriving after the player has ticked a row by hand would write the server's older view
  // over their newer one. Every editing control stays live during the request by design —
  // they consult `inflight`, which is the commit's — so this is reachable by pressing the
  // bulk control and then ticking anything.
  it("drops the answer when the player has edited the draft since asking", async () => {
    let release: (v: unknown) => void = () => {};
    actions.chooseBulk.mockReturnValue(new Promise((r) => { release = r; }));
    render(<Harness candidates={[candidate("free-1", true), candidate("free-2", true)]} />);

    fireEvent.click(screen.getByRole("button", { name: /Tick all/ }));
    // A hand tick, after the request is out and before it answers.
    fireEvent.click(rowBox("free-2"));
    expect(rowBox("free-2")).toBeChecked();

    await act(async () => {
      release({ ok: true, oracleIds: ["free-1"] });
    });

    // The server's answer named free-1 only. Applying it would have replaced the hand tick.
    expect(rowBox("free-2")).toBeChecked();
    expect(rowBox("free-1")).not.toBeChecked();
  });

  // THE DECK MOVES TOO, not only the selection. A quick-add or a removal elsewhere changes how
  // many slots are open without touching `ticked` or `declined` — so an answer planned for the
  // old slot count would be applied to a deck that is no longer the one it was asked about.
  it("drops the answer when the deck's open slots have changed since asking", async () => {
    let release: (v: unknown) => void = () => {};
    actions.chooseBulk.mockReturnValue(new Promise((r) => { release = r; }));
    const cards = [candidate("free-1", true), candidate("free-2", true)];
    const { rerender } = render(<Harness openSlots={3} candidates={cards} />);

    fireEvent.click(screen.getByRole("button", { name: /Tick all/ }));
    // Two slots now, because something was added to the deck while the server was thinking.
    rerender(<Harness openSlots={2} candidates={cards} />);

    await act(async () => {
      release({ ok: true, oracleIds: ["free-1", "free-2"] });
    });

    expect(rowBox("free-1")).not.toBeChecked();
    expect(rowBox("free-2")).not.toBeChecked();
  });

  // A SWAP MOVES THE CONTENTS AND NOT THE COUNT. `chooseBulkFill` seeds its role counts from
  // the deck's cards, so a plan made before the swap is stale in precisely the way this
  // feature is about — with `openSlots` unchanged to hide it.
  it("drops the answer when the deck's cards have changed since asking", async () => {
    let release: (v: unknown) => void = () => {};
    actions.chooseBulk.mockReturnValue(new Promise((r) => { release = r; }));
    const cards = [candidate("free-1", true), candidate("free-2", true)];
    const { rerender } = render(
      <Harness deckOracleIds={new Set(["in-deck-a"])} candidates={cards} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Tick all/ }));
    // One card out, one in: the same number of open slots, a different deck.
    rerender(<Harness deckOracleIds={new Set(["in-deck-b"])} candidates={cards} />);

    await act(async () => {
      release({ ok: true, oracleIds: ["free-1", "free-2"] });
    });

    expect(rowBox("free-1")).not.toBeChecked();
    expect(rowBox("free-2")).not.toBeChecked();
  });

  it("does not bring back a row the player set aside", async () => {
    // A bulk control that resurrected a decline would undo a choice with a press
    // meant to save presses. The action does not know about this list's declines — it reads
    // the deck — so the control intersects its answer with what this list can tick, and this
    // case is that intersection.
    actions.chooseBulk.mockResolvedValue({ ok: true, oracleIds: ["free-1", "free-2"] });
    render(
      <Harness
        candidates={[candidate("free-1", true), candidate("free-2", true)]}
        initialDeclined={["free-2"]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: topOffCopy.list.tickOwnedAria("1") }));
    await screen.findByRole("button", { name: topOffCopy.list.tickOwnedAria("1") });
    const boxes = screen.getAllByRole("checkbox");
    expect(boxes.filter((b) => (b as HTMLInputElement).checked)).toHaveLength(1);
  });
});

describe("TopOffList — the desktop row", () => {
  // Desktop alone. The phone row is one tap target on purpose — the addendum's
  // own rule, and what makes 38 of them tickable one-handed — so neither the
  // trigger nor the type word may appear there.
  function desktop() {
    const viewport = stubViewport(1280);
    render(<Harness />);
    return viewport;
  }

  /** The row's own element, from the checkbox that names it. */
  const rowOf = (name: string) => rowBox(name).closest("li") ?? rowBox(name).parentElement;

  it("draws no underline under the card name", () => {
    // Nothing else in this app underlines a `CardDetailTrigger`, and on this
    // surface the dashed underline is the decline's own reversible register —
    // an underlined name reads as a second control of that kind.
    desktop();

    const trigger = screen.getByRole("button", {
      name: cardDetailCopy.triggerAria("owned-1"),
    });
    expect(trigger.className).not.toContain("underline");
  });

  it("opens the card from the name, as a control outside the tick's label", () => {
    desktop();

    // Named by the trigger's own spoken name, not by a loose match on the card:
    // the decline control on the same row also carries the card's name.
    const trigger = screen.getByRole("button", {
      name: cardDetailCopy.triggerAria("owned-1"),
    });
    // OUTSIDE the label: a control nested in one toggles the tick on every press
    // of it, which is the trap the decline control is already placed against.
    expect(trigger.closest("label")).toBeNull();
  });

  it("states the card's type", () => {
    desktop();

    // The bucket word, which is the synergy panel's own `all`-facet rule: this
    // list has no facet filter, so every row here is that case.
    expect(rowOf("owned-1")).toHaveTextContent("Spell");
  });

  it("draws neither on a phone", () => {
    stubViewport(390);
    render(<Harness />);

    // Named by the trigger's OWN spoken name. `/^owned-1$/` can never match it —
    // the trigger's accessible name is `View details for owned-1` — so that form
    // passed at every width and let a trigger leak onto the one-tap phone row.
    expect(
      screen.queryByRole("button", { name: cardDetailCopy.triggerAria("owned-1") }),
    ).toBeNull();
    expect(rowOf("owned-1")).not.toHaveTextContent("Spell");
  });

  it("lights under the pointer, and never on a row that cannot be ticked", () => {
    // The fill had to leave the inline `style` to have a hover at all: an inline
    // background outranks every utility, which is why this row never had one.
    stubViewport(1280);
    render(<Harness openSlots={1} initialTicked={["owned-1"]} />);

    // `owned-2` is inert at the cap: a fill that lights under the pointer would
    // promise a tick the row cannot take.
    expect(rowOf("owned-2")?.className).not.toContain("md:hover:bg-");
    // The ticked row is not inert, and carries the fill outright rather than a
    // hover: it is already at the hovered colour, so a hover rule would be a
    // no-op dressed as a state.
    expect(rowOf("owned-1")?.className).toContain("bg-[color:var(--elevated-hover)]");
  });

  it("lights a row that can still be ticked", () => {
    stubViewport(1280);
    render(<Harness openSlots={3} />);

    expect(rowOf("owned-1")?.className).toContain("md:hover:bg-");
    // `--row-bg` travels with the fill so anything drawing a seam against the
    // row tracks the swap rather than a fixed colour.
    expect(rowOf("owned-1")?.className).toContain("md:hover:[--row-bg:");
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
    // The rule is about the PIPS, not about the slot. Both rows hold the column
    // open on desktop — the header reserves `COST_TRACK` for every row, so a row
    // that mounted nothing would pull the four columns after it 72px left of
    // their own headings — and what the back-face row must not draw is a cost.
    const track = (name: string) => rowOf(name)?.querySelector("[class*='md:order-4']");
    expect(track("owned-1")).not.toBeNull();
    expect(track("owned-2")).not.toBeNull();
    expect(track("owned-1")?.childElementCount).toBe(0);
    expect(track("owned-2")?.childElementCount).toBeGreaterThan(0);
  });
});
