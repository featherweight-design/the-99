import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { topOffCopy } from "../../lib/copy/top-off";
import { synergyCopy } from "../../lib/copy/synergy-discovery";
import { stubViewport } from "../../test-utils/stub-viewport";
import type { TopOffCandidateWithFacts } from "../../lib/decks/last-slots";
import { CardDetailProvider, cardDetailCopy } from "../cards/card-detail-provider";

const actions = vi.hoisted(() => ({
  commit: vi.fn(),
  chooseBulk: vi.fn(),
  bulkOptions: vi.fn(),
}));
vi.mock("../../app/decks/actions", () => ({
  commitTopOff: actions.commit,
  chooseBulkFill: actions.chooseBulk,
  // THE PAIR'S FIGURES, asked for when the list opens. Both plans run there so a player can
  // compare what each control concedes before pressing either, so every case that renders the
  // list reaches this — a default is set in `beforeEach` and cases that are ABOUT the pair
  // override it.
  bulkFillOptions: actions.bulkOptions,
}));

/** An answer from one pool. `measuredTypes: true` with no shortfalls is the b2 face —
 *  the fill closed every gap — which is the sensible default for cases about other things. */
const plan = (over: Partial<{ oracleIds: string[]; shortfalls: unknown[]; measuredTypes: boolean }> = {}) => ({
  oracleIds: over.oracleIds ?? [],
  shortfalls: over.shortfalls ?? [],
  measuredTypes: over.measuredTypes ?? true,
});

import { TopOffList } from "./top-off-list";

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
    // No facts and no combo partner, STATED rather than omitted: both are required on the
    // deck-scoped row type, so the page's attachment cannot be deleted without a compile
    // error. See `RowCandidate` in top-off-list.tsx.
    facts: null,
    comboPartner: null,
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
  candidates?: TopOffCandidateWithFacts[];
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
      declaredBracket={null}
      noteCounts={{ gameChanger: 0, extraTurns: 0, tutor: 0 }}
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
  // The pair's default answer: both pools return nothing and concede nothing. Cases that are
  // about the pair override it; every other case just needs the fetch not to reject.
  actions.bulkOptions
    .mockReset()
    .mockResolvedValue({ ok: true, collection: plan(), best: plan({ oracleIds: ["x"] }) });
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
    actions.bulkOptions.mockResolvedValue({
      ok: true,
      collection: plan({ oracleIds: ["owned-1"] }),
      best: plan({ oracleIds: ["owned-2"] }),
    });
    render(<Harness openSlots={1} />);

    const button = await screen.findByRole("button", {
      name: topOffCopy.bulk.collectionAria("1", topOffCopy.bulk.gapNone),
    });
    expect(button).toHaveTextContent(topOffCopy.bulk.collection("1"));

    await click(button);
    expect(screen.getByText(topOffCopy.list.headMobile("1", "1"))).toBeInTheDocument();
  });

  // Hugh, 2026-09-28: `Select 6 from my collection` ticked nothing. The figure was counted from the
  // list (every card free to sleeve, capped at the slots) while the press ticked what the PLAN chose
  // among them. The label and the press now read one source, the plan, so they cannot disagree.
  it("names the rows the plan will tick, where the list holds more it did not choose", async () => {
    actions.bulkOptions.mockResolvedValue({
      ok: true,
      collection: plan({ oracleIds: ["owned-1"] }),
      best: plan({ oracleIds: ["owned-1", "owned-2", "buy-1"] }),
    });
    render(<Harness openSlots={3} />);

    const button = await screen.findByRole("button", { name: /from your collection/ });
    // Two cards are free to sleeve and three slots are open; the plan chose one.
    expect(button).toHaveTextContent(topOffCopy.bulk.collection("1"));
    await click(button);
    expect(screen.getByText(topOffCopy.list.headMobile("1", "3"))).toBeInTheDocument();

    const best = screen.getByRole("button", { name: /this deck needs/ });
    expect(best).toHaveTextContent(topOffCopy.bulk.best("3"));
    await click(best);
    expect(screen.getByText(topOffCopy.list.headMobile("3", "3"))).toBeInTheDocument();
  });

  // The 0 case of the same rule: a plan that chose none of the cards free to sleeve draws no
  // collection control at all, rather than a live button that does nothing.
  it("draws no collection control when its plan would tick nothing", async () => {
    actions.bulkOptions.mockResolvedValue({
      ok: true,
      collection: plan({ oracleIds: [] }),
      best: plan({ oracleIds: ["buy-1"] }),
    });
    render(<Harness openSlots={3} />);

    const best = await screen.findByRole("button", { name: /this deck needs/ });
    expect(screen.queryByRole("button", { name: /from your collection/ })).not.toBeInTheDocument();
    expect(best).toHaveTextContent(topOffCopy.bulk.best("1"));
    await click(best);
    expect(screen.getByText(topOffCopy.list.headMobile("1", "3"))).toBeInTheDocument();
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
  const claimed = (id: string): TopOffCandidateWithFacts => ({
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
    // HELD OPEN, not resolved. This control became ASYNC in #798 — it awaits a server action
    // before it ticks anything — and the wait that used to sit below named the button that was
    // already in the document, so it resolved without waiting for the action and the
    // assertions raced the state update: green locally, red at random on a loaded runner.
    //
    // A `mockResolvedValue` settles in the same turn, so it cannot PIN that: the broken wait
    // stays green against it and the regression walks back in. The promise is held open and
    // released deliberately, which makes the unchecked assertion below real.
    let release: (v: unknown) => void = () => {};
    actions.bulkOptions.mockReturnValue(new Promise((r) => { release = r; }));
    render(<Harness candidates={[claimed("held-1"), candidate("free-1", true)]} />);

    // THE PAIR IS ABSENT UNTIL ITS FIGURES LAND. The plans run when the list opens so both
    // concessions are legible before either press, so the wait that matters moved from the
    // press to the open — and it is held open here for the same reason as before: an answer
    // that settles in the same turn cannot tell a real wait from a missing one.
    expect(
      screen.queryByRole("button", { name: /from your collection/ }),
    ).not.toBeInTheDocument();

    const byName = (name: string) =>
      screen.getAllByRole("checkbox")
        .find((b) => (b.getAttribute("aria-label") ?? "").includes(name));

    expect(byName("free-1")).not.toBeChecked();

    await act(async () => {
      release({
        ok: true,
        collection: plan({ oracleIds: ["free-1", "held-1"] }),
        best: plan({ oracleIds: ["free-1"] }),
      });
    });

    const bulk = screen.getByRole("button", { name: /from your collection/ });
    expect(bulk).toHaveTextContent(topOffCopy.bulk.collection("1"));
    await act(async () => {
      fireEvent.click(bulk);
    });

    // The plan offered a HELD card and the list refuses it. Offering and choosing are
    // different things, and only the second is this list's to decide.
    expect(byName("free-1")).toBeChecked();
    expect(byName("held-1")).not.toBeChecked();
  });

  // A REFUSAL CHANGES NOTHING, which is the rule state 15 states for the commit beside this.
  // The handler used to hand `onTickedChange` an empty set on `ok: false`, throwing away every
  // tick the player had made by hand — and the empty set is a real value here, drawn by the
  // clear control, so it cannot double as a failure outcome. It dropped the message too.
  it("keeps the ticks and says why when the choice is refused", async () => {
    const onAnnounce = vi.fn();
    actions.bulkOptions.mockResolvedValue({ ok: false, message: "Couldn’t work that out." });
    render(<Harness
      candidates={[candidate("free-1", true), candidate("free-2", true)]}
      onAnnounce={onAnnounce}
    />);

    const box = screen.getAllByRole("checkbox")[0];
    fireEvent.click(box);
    expect(box).toBeChecked();

    // THE REFUSAL ARRIVES FROM THE OPEN, not from a press: the plans run when the list opens
    // so both concessions are legible before either press, so that is where the failure is.
    await screen.findByTestId("top-off-refusal");

    expect(screen.getByTestId("top-off-refusal")).toHaveTextContent("Couldn’t work that out.");
    expect(screen.getAllByRole("checkbox")[0]).toBeChecked();
    // `RefusalPlate` carries no live role, so drawing the message reaches sighted readers and
    // nobody else.
    expect(onAnnounce).toHaveBeenCalledWith("Couldn’t work that out.");
  });

  it("draws a refusal rather than going silent when the call throws", async () => {
    actions.bulkOptions.mockRejectedValue(new Error("network"));
    render(<Harness candidates={[candidate("free-1", true)]} />);

    // THE REFUSAL ARRIVES FROM THE OPEN, not from a press: the plans run when the list opens
    // so both concessions are legible before either press, so that is where the failure is.
    await screen.findByTestId("top-off-refusal");

    expect(screen.getByTestId("top-off-refusal"))
      .toHaveTextContent(synergyCopy.lastSlots.topUpFailed);
  });

  // FOUR STALENESS CASES WERE DELETED HERE, and the reason is that the race they pinned no
  // longer exists rather than that it stopped mattering.
  //
  // The single control was asynchronous ON THE PRESS: it asked the server for a plan and the
  // draft could move — a hand tick, a decline, a quick-add closing a slot — in the gap before
  // the answer came back. Those four cases held the action open, moved the draft, and
  // asserted the answer was dropped.
  //
  // The pair asks for both plans when the list OPENS, because both concessions have to be
  // legible before either press. So the press applies ids it already holds, synchronously,
  // against the list as it stands at that instant. There is no gap to go stale in, and a case
  // pretending otherwise would have to fake an async press that does not exist to run at all.
  //
  // What survives, and is asserted above: a press intersects with the CURRENT list, so a row
  // set aside or gone illegal since the plans landed is not selected. That is the same rule,
  // moved to the only place it can still be broken.

  // ── The pair's own states (b1–b11) ───────────────────────────────────────

  // b1 · THE ORDINARY PAIR — two controls, two different concessions.
  //
  // THE COUNTS ARE NOT ASSERTED TO MATCH, and that is deliberate. The handoff's copy comment
  // says "both labels state the same count — the open slots — because both fills take every
  // one of them", which is true in b1's own figures (23 sleevable for 12 open) and false
  // wherever the collection holds fewer cards than there are slots. The collection control
  // therefore names `tickable`, what it can actually select; see the note in the component.
  // This case asserts the two notes, which is what it can see.
  it("draws both controls with the same count and different concessions", async () => {
    actions.bulkOptions.mockResolvedValue({
      ok: true,
      collection: plan({
        oracleIds: ["free-1"],
        shortfalls: [{ kind: "type", type: "creature", short: 2 }],
      }),
      best: plan({ oracleIds: ["free-2"] }),
    });
    render(<Harness candidates={[candidate("free-1", true), candidate("free-2", false)]} />);

    await screen.findByRole("button", { name: /from your collection/ });
    expect(screen.getByRole("button", { name: /this deck needs/ })).toBeInTheDocument();

    const notes = screen.getAllByText(/short of recommendations|to buy/);
    expect(notes[0]).toHaveTextContent("2 creatures short of recommendations");
    // The buy figure is computed from the rows the press will ACTUALLY select, so the note and
    // the selection cannot disagree: `free-2` is the one unowned row in the best plan.
    expect(screen.getByText(topOffCopy.bulk.buy("1", null))).toBeInTheDocument();
  });

  // THE PLANS ARE ASKED FOR AGAIN WHEN THE DECK MOVES, and `openSlots` alone cannot see it.
  //
  // A quick-add and a removal while the list is open leave the slot count exactly where it was
  // while the deck underneath changes, so both notes and both id sets would go on describing a
  // deck that no longer exists. The single control this pair replaces asked on the PRESS and
  // so could only be stale by one round trip; asking at the open makes the answer live for as
  // long as the list is.
  it("asks again when the deck's cards change under a steady slot count", async () => {
    function Swapper() {
      const [ids, setIds] = useState(new Set(["in-deck-a"]));
      return (
        <>
          <button onClick={() => setIds(new Set(["in-deck-b"]))}>swap</button>
          <Harness deckOracleIds={ids} openSlots={3} />
        </>
      );
    }
    // A plan that ticks something, so the control is drawn and its arrival can be waited on.
    actions.bulkOptions.mockResolvedValue({
      ok: true,
      collection: plan({ oracleIds: ["owned-1"] }),
      best: plan({ oracleIds: ["buy-1"] }),
    });
    render(<Swapper />);
    await screen.findByRole("button", { name: /from your collection/ });
    expect(actions.bulkOptions).toHaveBeenCalledTimes(1);

    await act(async () => {
      screen.getByRole("button", { name: "swap" }).click();
    });

    expect(actions.bulkOptions).toHaveBeenCalledTimes(2);
  });

  // THE BUY NOTE COUNTS WHAT THE PRESS TAKES, not what the plan named. A declined unowned row
  // still in the best plan is dropped by the press, so counting it here promises a purchase
  // the commit bar contradicts a moment later.
  it("leaves a declined row out of the buy figure", async () => {
    actions.bulkOptions.mockResolvedValue({
      ok: true,
      collection: plan(),
      best: plan({ oracleIds: ["buy-1", "buy-2"] }),
    });
    render(
      <Harness
        candidates={[candidate("buy-1", false), candidate("buy-2", false)]}
        initialDeclined={["buy-2"]}
      />,
    );

    await screen.findByRole("button", { name: /this deck needs/ });
    expect(screen.getByText(topOffCopy.bulk.buy("1", null))).toBeInTheDocument();
    expect(screen.queryByText(topOffCopy.bulk.buy("2", null))).not.toBeInTheDocument();
  });

  // b3 IS ASKED AFTER EACH POOL'S OWN ALLOW-LIST. Two plans differing only by a row that
  // NEITHER press can take are the same answer wearing two buttons — and the two allow-lists
  // are genuinely different, so the raw lists are the wrong thing to compare.
  it("still drops the second control when the only difference is a declined row", async () => {
    actions.bulkOptions.mockResolvedValue({
      ok: true,
      collection: plan({ oracleIds: ["free-1"] }),
      best: plan({ oracleIds: ["free-1", "free-2"] }),
    });
    render(
      <Harness
        candidates={[candidate("free-1", true), candidate("free-2", true)]}
        initialDeclined={["free-2"]}
      />,
    );

    await screen.findByRole("button", { name: /from your collection/ });
    expect(screen.queryByRole("button", { name: /this deck needs/ })).not.toBeInTheDocument();
  });

  // b2 · THE COLLECTION CONCEDES NOTHING, and the nil is STATED. A blank beside one control
  // and a figure beside the other reads as a missing figure, and the nil is the answer the
  // player came for.
  it("states the nil concession rather than leaving the slot blank", async () => {
    actions.bulkOptions.mockResolvedValue({
      ok: true,
      collection: plan({ oracleIds: ["free-1"] }),
      best: plan({ oracleIds: ["free-2"] }),
    });
    render(<Harness candidates={[candidate("free-1", true), candidate("free-2", false)]} />);

    await screen.findByText(topOffCopy.bulk.gapNone);
  });

  // b3 · THE TWO FILLS ARE THE SAME SET, so the second control is ABSENT and the survivor's
  // note says why. Two controls that do the same thing are the shipped #361 defect in a new
  // costume, and an absence with no reason beside it reads as a bug.
  it("drops the second control when both pools chose the same cards", async () => {
    actions.bulkOptions.mockResolvedValue({
      ok: true,
      // The same ids in a DIFFERENT ORDER, because both are applied as a set: an
      // order-sensitive comparison would draw two controls that do exactly the same thing.
      collection: plan({ oracleIds: ["free-1", "free-2"] }),
      best: plan({ oracleIds: ["free-2", "free-1"] }),
    });
    render(<Harness candidates={[candidate("free-1", true), candidate("free-2", true)]} />);

    await screen.findByRole("button", { name: /from your collection/ });
    expect(screen.queryByRole("button", { name: /this deck needs/ })).not.toBeInTheDocument();
    expect(
      screen.getByText(topOffCopy.bulk.andNothingToBuy(topOffCopy.bulk.gapNone)),
    ).toBeInTheDocument();
  });

  // b6 · NO MIX TO MEASURE AGAINST. An empty shortfall list means "nothing was compared" here,
  // not "nothing is missing" — `matches every recommendation` would be the strongest possible
  // claim made from no data.
  it("says there is no recommendation rather than claiming a match", async () => {
    actions.bulkOptions.mockResolvedValue({
      ok: true,
      collection: plan({ oracleIds: ["free-1"], measuredTypes: false }),
      best: plan({ oracleIds: ["free-2"] }),
    });
    render(<Harness candidates={[candidate("free-1", true), candidate("free-2", false)]} />);

    await screen.findByText(topOffCopy.bulk.gapUnmeasured);
    expect(screen.queryByText(topOffCopy.bulk.gapNone)).not.toBeInTheDocument();
  });

  // b9 · NOTHING TO SLEEVE. The collection control is ABSENT, not disabled, and the remaining
  // control keeps its own label: renaming it `Select 1` would hide that every one of them is
  // a purchase.
  it("drops the collection control when there is nothing to sleeve", async () => {
    actions.bulkOptions.mockResolvedValue({
      ok: true,
      collection: plan(),
      best: plan({ oracleIds: ["buy-1"] }),
    });
    render(<Harness candidates={[candidate("buy-1", false)]} />);

    await screen.findByRole("button", { name: /this deck needs/ });
    expect(
      screen.queryByRole("button", { name: /from your collection/ }),
    ).not.toBeInTheDocument();
  });

  // b11 · AT THE CAP, MID-SELECTION. While a hand-made selection fills the slots, replacing it
  // is the whole of what a press would do, and that outranks the figure. BOTH notes take it,
  // and the figures return when the selection is reduced.
  it("yields both notes to the replacement warning at the cap", async () => {
    actions.bulkOptions.mockResolvedValue({
      ok: true,
      collection: plan({
        oracleIds: ["free-1"],
        shortfalls: [{ kind: "type", type: "creature", short: 2 }],
      }),
      best: plan({ oracleIds: ["free-2"] }),
    });
    render(
      <Harness
        openSlots={1}
        candidates={[candidate("free-1", true), candidate("free-2", true)]}
      />,
    );
    await screen.findByRole("button", { name: /from your collection/ });

    await act(async () => {
      rowBox("free-1").click();
    });

    expect(screen.getAllByText(topOffCopy.bulk.replacesOne)).toHaveLength(2);
    expect(
      screen.queryByText(/short of recommendations/),
    ).not.toBeInTheDocument();
  });

  // THE CONCESSION IS SPOKEN BEFORE THE PRESS. A sibling note is read AFTER the choice on a
  // linear pass, so the figure lives in each button's accessible name — and the visible note
  // is `aria-hidden` so it is not spoken twice.
  it("carries the concession in the accessible name, and hides the visible note", async () => {
    actions.bulkOptions.mockResolvedValue({
      ok: true,
      collection: plan({
        oracleIds: ["free-1"],
        shortfalls: [{ kind: "type", type: "creature", short: 2 }],
      }),
      best: plan({ oracleIds: ["free-2"] }),
    });
    render(<Harness candidates={[candidate("free-1", true), candidate("free-2", false)]} />);

    const button = await screen.findByRole("button", {
      name: topOffCopy.bulk.collectionAria("1", "2 creatures short of recommendations"),
    });
    expect(button).toBeInTheDocument();
    expect(screen.getByText("2 creatures short of recommendations"))
      .toHaveAttribute("aria-hidden", "true");
  });

  it("does not bring back a row the player set aside", async () => {
    // A bulk control that resurrected a decline would undo a choice with a press
    // meant to save presses. The action does not know about this list's declines — it reads
    // the deck — so the control intersects its answer with what this list can tick, and this
    // case is that intersection.
    actions.bulkOptions.mockResolvedValue({
      ok: true,
      collection: plan({ oracleIds: ["free-1", "free-2"] }),
      best: plan({ oracleIds: ["free-1"] }),
    });
    render(
      <Harness
        candidates={[candidate("free-1", true), candidate("free-2", true)]}
        initialDeclined={["free-2"]}
      />,
    );

    const checkedNow = () => screen.getAllByRole("checkbox")
      .filter((b) => (b as HTMLInputElement).checked);

    const bulk = await screen.findByRole("button", { name: /from your collection/ });
    expect(checkedNow()).toHaveLength(0);

    await act(async () => {
      fireEvent.click(bulk);
    });

    // The plan named both; the declined row is not selected. A bulk control that resurrected
    // a decline would undo a choice with a press meant to save presses.
    expect(checkedNow()).toHaveLength(1);
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
  const rowOf = (name: string) => rowBox(name).closest("[data-top-off-row]");

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
  const rowOf = (name: string) => rowBox(name).closest("[data-top-off-row]");

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
