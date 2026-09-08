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
      newestAsOf={null}
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

    expect(screen.getByRole("alert")).toHaveTextContent("Deck is full.");
    expect(onAnnounce).toHaveBeenLastCalledWith(topOffCopy.commit.refused);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getAllByRole("checkbox", { checked: true })).toHaveLength(2);
  });

  // A call that never arrived and one that arrived and failed are the same
  // event to the player.
  it("draws the same refusal when the call itself throws", async () => {
    actions.commit.mockRejectedValue(new Error("network"));
    render(<Harness initialTicked={["owned-1"]} />);

    await click(screen.getByRole("button", { name: topOffCopy.commit.addAria("1", "97") }));

    expect(screen.getByRole("alert")).toHaveTextContent(topOffCopy.commit.refused);
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
