import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { topOffCopy } from "../../lib/copy/top-off";
// `total` is copies rather than rows on the production call site, so the helper
// below counts it the same way — a row-count helper would pass a stacked deck's
// tests while the shipped header disagreed with them.
import { cardCopies, type DeckDetailCard } from "../../lib/decks/grouping";
import type { FillPassSummary } from "../../lib/decks/fill-passes";

// ── Module mock — the server action the ledger calls ──
vi.mock("../../app/decks/actions", () => ({
  undoFillPass: vi.fn(),
}));

const { ProvenanceLedger } = await import("./provenance-line");

const ledger = topOffCopy.ledger;

// ── Fixture helpers ──────────────────────────────────────────────────────────

function makeCard(
  id: string,
  opts: { auto?: boolean; owned?: boolean; quantity?: number } = {},
): DeckDetailCard {
  return {
    oracleId: id,
    name: `Card ${id}`,
    typeLine: "Artifact",
    cardTypeGroup: "Artifacts",
    role: "ramp",
    owned: opts.owned ?? true,
    quantity: opts.quantity ?? 1,
    auto: opts.auto ?? false,
    availability: null,
  } as DeckDetailCard;
}

function makePass(
  id: string,
  opts: Partial<FillPassSummary> & { oracleIds?: string[] } = {},
): FillPassSummary {
  const oracleIds = opts.oracleIds ?? ["a"];
  return {
    id,
    kind: opts.kind ?? "top_off",
    ordinal: opts.ordinal ?? 1,
    createdAt: new Date("2026-01-01"),
    live: opts.live ?? oracleIds.length,
    kept: opts.kept ?? 0,
    removed: opts.removed ?? 0,
    openSlots: opts.openSlots ?? 5,
    liveCards: opts.liveCards ?? oracleIds.map((oracleId) => ({ oracleId, quantity: 1 })),
  };
}

function mount(
  cards: DeckDetailCard[],
  passes: FillPassSummary[],
  overrides: { onShow?: (id: string) => void } = {},
) {
  return render(
    <ProvenanceLedger
      deckId="deck-1"
      bodySize={99}
      cards={cards}
      total={cardCopies(cards.filter((c) => c.auto))}
      passes={passes}
      onShow={overrides.onShow ?? vi.fn()}
      onAnnounce={vi.fn()}
    />,
  );
}

/** The line's sentences. Read whole rather than through `getByText`, because
 *  the card count is its own element — the sentence is broken up by design. */
function sentences(): string[] {
  return Array.from(document.querySelectorAll("p")).map((p) => p.textContent ?? "");
}

// ── ProvenanceLedger ────────────────────────────────────────────────────────

describe("ProvenanceLedger", () => {
  it("renders only when the deck holds at least one auto card", () => {
    mount([makeCard("a"), makeCard("b")], [makePass("p1")]);
    expect(screen.queryByText(ledger.header("2"))).not.toBeInTheDocument();
  });

  it("counts the deck's auto cards in the header, not the passes' cards", () => {
    // Two auto cards, one pass that placed only one of them: the header states
    // what the deck holds, the line states what the pass did.
    mount(
      [makeCard("a", { auto: true }), makeCard("b", { auto: true })],
      [makePass("p1", { oracleIds: ["a"] })],
    );
    expect(screen.getByText(ledger.header("2"))).toBeInTheDocument();
  });

  it("names the seed and each top-off in order, oldest first", () => {
    mount(
      [makeCard("a", { auto: true }), makeCard("b", { auto: true })],
      [
        makePass("seed", { kind: "seed", ordinal: 0, oracleIds: ["a"] }),
        makePass("p1", { ordinal: 1, oracleIds: ["b"] }),
      ],
    );
    const labels = screen
      .getAllByText(new RegExp(`^(${ledger.seedLabel}|${ledger.passLabel("1")})$`))
      .map((el) => el.textContent);
    expect(labels).toEqual([ledger.seedLabel, ledger.passLabel("1")]);
  });

  it("counts a pass's unowned cards as its buy figure", () => {
    mount(
      [makeCard("a", { auto: true, owned: false }), makeCard("b", { auto: true })],
      [makePass("p1", { oracleIds: ["a", "b"], openSlots: 5 })],
    );
    expect(sentences()).toContain(`${ledger.lead("2", "2")}: ${ledger.passLine("5", "1")}`);
  });

  it("counts copies, not cards, in a stacked pass's buy figure", () => {
    // Four copies of one unowned card is four to buy, not one.
    mount(
      [makeCard("a", { auto: true, owned: false, quantity: 4 })],
      [makePass("p1", {
        oracleIds: ["a"],
        live: 4,
        openSlots: 5,
        liveCards: [{ oracleId: "a", quantity: 4 }],
      })],
    );
    expect(sentences()).toContain(`${ledger.lead("4", "4")}: ${ledger.passLine("5", "4")}`);
  });

  it("drops the buy clause when the pass bought nothing", () => {
    mount(
      [makeCard("a", { auto: true }), makeCard("b", { auto: true })],
      [makePass("p1", { oracleIds: ["a", "b"], openSlots: 5 })],
    );
    expect(sentences()).toContain(`${ledger.lead("2", "2")}: ${ledger.passLineNoBuy("5")}`);
  });

  it("states the recount instead of the base sentence once cards have moved", () => {
    mount(
      [makeCard("a", { auto: true })],
      [makePass("p1", { oracleIds: ["a"], live: 1, kept: 1, removed: 1 })],
    );
    // Two figures: 3 placed, 1 still here, then the quiet clause in place of the description.
    expect(sentences()).toContain(`${ledger.lead("3", "1")} · ${ledger.passRecountedBoth("1", "1")}`);
    expect(sentences().join(" ")).not.toContain("you chose them from the last");
  });

  it("states a fully undone pass as a quiet line with no Show and no Undo", () => {
    mount(
      [makeCard("a", { auto: true })],
      [
        makePass("p1", { ordinal: 1, oracleIds: ["a"] }),
        makePass("p2", { ordinal: 2, oracleIds: [], live: 0, kept: 0, removed: 9, liveCards: [] }),
      ],
    );
    expect(sentences()).toContain(`${ledger.leadNone("9")} · ${ledger.passUndone}`);
    expect(screen.queryByRole("button", { name: ledger.markAria("0", ledger.passLabel("2")) })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: ledger.undoAria("0", ledger.passLabel("2")) })).not.toBeInTheDocument();
    // The live pass keeps its controls.
    expect(screen.getByRole("button", { name: ledger.undoAria("1", ledger.passLabel("1")) })).toBeInTheDocument();
  });

  it("states a fully kept pass as all now yours", () => {
    mount(
      [makeCard("a", { auto: true })],
      [
        makePass("p1", { ordinal: 1, oracleIds: ["a"] }),
        makePass("p2", { ordinal: 2, oracleIds: [], live: 0, kept: 9, removed: 0, liveCards: [] }),
      ],
    );
    expect(sentences()).toContain(`${ledger.leadNone("9")} · ${ledger.passAllKept("9")}`);
  });

  it("makes the still-here figures sum to the header", () => {
    const cards = [
      makeCard("a", { auto: true, quantity: 5 }),
      makeCard("b", { auto: true, quantity: 3 }),
    ];
    mount(cards, [
      makePass("seed", { kind: "seed", ordinal: 1, oracleIds: ["a"], live: 5, liveCards: [{ oracleId: "a", quantity: 5 }] }),
      makePass("p1", { ordinal: 1, oracleIds: ["b"], live: 3, removed: 4, kept: 2, liveCards: [{ oracleId: "b", quantity: 3 }] }),
      makePass("p2", { ordinal: 2, oracleIds: [], live: 0, removed: 9, liveCards: [] }),
    ]);
    const here = sentences()
      .map((t) => /(\d+) still here|all (\d+) still here/.exec(t))
      .filter((m): m is RegExpExecArray => m != null)
      .reduce((n, m) => n + Number(m[1] ?? m[2]), 0);
    expect(screen.getByText(ledger.header("8"))).toBeInTheDocument();
    expect(here).toBe(8);
  });

  it("says so when the deck predates the ledger", () => {
    mount([makeCard("a", { auto: true })], []);
    expect(screen.getByText(/built before we started keeping this record/)).toBeInTheDocument();
  });

  it("offers the sweep as the seed's reversal rather than an undo of its own", () => {
    mount(
      [makeCard("a", { auto: true })],
      [makePass("seed", { kind: "seed", ordinal: 0, oracleIds: ["a"] })],
    );
    // Two spans, one per width — the line is mounted once and the widths hide
    // each other's copy, which is how every other responsive split here works.
    expect(screen.getAllByText(ledger.seedReversal)).toHaveLength(2);
    expect(
      screen.queryByRole("button", { name: ledger.undoAria("1", ledger.seedLabel) }),
    ).not.toBeInTheDocument();
  });

  it("opens the pass sheet on that pass: a dialog press, not a toggle", () => {
    const onShow = vi.fn();
    mount([makeCard("a", { auto: true })], [makePass("p1", { oracleIds: ["a"] })], { onShow });
    const show = screen.getByRole("button", {
      name: ledger.markAria("1", ledger.passLabel("1")),
    });
    expect(show).not.toHaveAttribute("aria-pressed");
    expect(show).toHaveAttribute("aria-haspopup", "dialog");
    fireEvent.click(show);
    expect(onShow).toHaveBeenCalledWith("p1");
  });

  it("announces the deck size the undo settled on, not the one it started from", async () => {
    // Rule (g) leaves every other control live during an undo, so a hand
    // removal can land while this one is in flight. Announcing 99-minus-what-
    // I-removed off the pre-click figure states a size that was never true.
    const { undoFillPass } = await import("../../app/decks/actions");
    let settle!: (result: { removed: number; built: number }) => void;
    vi.mocked(undoFillPass).mockReturnValue(
      new Promise((resolve) => {
        settle = resolve;
      }),
    );

    const onAnnounce = vi.fn();
    const passes = [makePass("p1", { oracleIds: ["a"] })];
    const props = {
      deckId: "deck-1",
      bodySize: 99,
      passes,
      onShow: vi.fn(),
      onAnnounce,
    };
    render(<ProvenanceLedger {...props} cards={[makeCard("a", { auto: true })]} total={1} />);

    fireEvent.click(
      screen.getByRole("button", { name: ledger.undoAria("1", ledger.passLabel("1")) }),
    );

    // The write counted the deck at 7 inside its own transaction: the one card
    // this undo took, plus two more a hand removal took while it was out.
    await act(async () => {
      settle({ removed: 1, built: 7 });
    });

    expect(onAnnounce).toHaveBeenCalledWith(topOffCopy.announce.undone("1", "7", 99));
  });

  it("keeps the line and states the refusal when an undo rejects", async () => {
    const { undoFillPass } = await import("../../app/decks/actions");
    vi.mocked(undoFillPass).mockRejectedValue(new Error("network"));

    mount([makeCard("a", { auto: true })], [makePass("p1", { oracleIds: ["a"] })]);
    fireEvent.click(
      screen.getByRole("button", { name: ledger.undoAria("1", ledger.passLabel("1")) }),
    );

    await waitFor(() => {
      expect(screen.getByText(ledger.undoFailed)).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: ledger.undoAria("1", ledger.passLabel("1")) }),
      ).not.toBeDisabled();
    });
  });

  it("leaves when the last auto card does", () => {
    const passes = [makePass("p1", { oracleIds: ["a"] })];
    const { rerender } = mount([makeCard("a", { auto: true })], passes);
    expect(screen.getByText(ledger.header("1"))).toBeInTheDocument();

    rerender(
      <ProvenanceLedger
        deckId="deck-1"
        cards={[makeCard("a", { auto: false })]}
        total={0}
        bodySize={99}
        passes={passes}
        onShow={vi.fn()}
        onAnnounce={vi.fn()}
      />,
    );
    expect(screen.queryByText(ledger.header("1"))).not.toBeInTheDocument();
  });
});
