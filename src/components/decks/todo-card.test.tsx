import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { deckImportCopy } from "../../lib/copy/deck-import";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import { guidedBannerCopy } from "../../lib/copy/decks-builder";
import { recommendationsCopy } from "../../lib/copy/recommendations";
import { availabilityCopy } from "../../lib/copy/availability";
import { overCopy } from "../../lib/copy/decks-builder";
import { tuningHubShortcutsCopy } from "../../lib/copy/tuning-hub-shortcuts";
import { COMMITTED } from "./__fixtures__/draft-state";
import { deckTodo, type TodoFacts } from "../../lib/decks/todo";

vi.mock("../../app/decks/actions", () => ({ fillDeck: vi.fn() }));
// Every moment anchor a row asks for, so M3's one registration can be counted.
const anchors = vi.hoisted(() => [] as { id: string; eligible: boolean }[]);
vi.mock("../moments/moments-provider", () => ({
  useMomentAnchor: (id: string, o: { eligible: boolean }) => {
    anchors.push({ id, eligible: o.eligible });
    return { ref: () => {} };
  },
}));

const { TodoCard, FillFailedRow, UnresolvedRow, PendingRow, OverRow, SpokenForTwiceRow } = await import("./todo-card");

const copy = deckVersioningCopy.todoCard;
const fill = recommendationsCopy.fill;
const unresolved = deckImportCopy.unresolved;

const QUIET: TodoFacts = { firstRun: false, filled: true, cards: 60, unresolved: 0 };

function draw(facts: TodoFacts, onLook = vi.fn()) {
  return render(
    <TodoCard
      todo={deckTodo(facts)}
      deckName="Big Stompy"
      renderRow={(row) =>
        row.kind === "fillFailed" ? (
          <FillFailedRow deckId="deck-1" next={row.next} />
        ) : row.kind === "unresolved" ? (
          <UnresolvedRow count={facts.unresolved} next={row.next} onLook={onLook} />
        ) : null
      }
    />,
  );
}

describe("TodoCard", () => {
  it("is absent when the deck has nothing to do", () => {
    const { container } = draw(QUIET);
    expect(container).toBeEmptyDOMElement();
  });

  it("heads the card with what the next step is fixing and the count", () => {
    draw({ ...QUIET, unresolved: 2 });
    expect(screen.getByText(copy.head("Big Stompy", "complete"))).toBeInTheDocument();
    expect(screen.getByText(copy.count(1))).toBeInTheDocument();
  });

  it("reads `built` over a failed fill", () => {
    draw({ ...QUIET, filled: false, cards: 0 });
    expect(screen.getByText(copy.head("Big Stompy", "built"))).toBeInTheDocument();
  });

  it("takes the guided step as its head on a first run", () => {
    draw({ ...QUIET, firstRun: true, cards: 0, unresolved: 3 });
    expect(screen.getByText(guidedBannerCopy.head)).toBeInTheDocument();
    expect(screen.queryByText(/^Before /)).toBeNull();
  });

  it("marks the next step, and fills its press alone", () => {
    draw({ ...QUIET, unresolved: 2 });
    expect(screen.getByText(copy.nextStep)).toBeInTheDocument();
    const press = screen.getByRole("button", { name: unresolved.bannerActionAria });
    expect(press.className).toContain("bg-[color:var(--fg)]");
  });

  it("draws an outlined press and no label on a row that is not the next step", () => {
    render(<UnresolvedRow count={2} next={false} onLook={vi.fn()} />);
    expect(screen.queryByText(copy.nextStep)).toBeNull();
    const press = screen.getByRole("button", { name: unresolved.bannerActionAria });
    expect(press.className).not.toContain("bg-[color:var(--fg)]");
    expect(press.className).toContain("var(--border-strong)");
  });
});

describe("UnresolvedRow", () => {
  it("draws the short verb, named in full, and jumps to the lines", () => {
    const onLook = vi.fn();
    draw({ ...QUIET, unresolved: 2 }, onLook);
    expect(screen.getByText(unresolved.rowTitle(2))).toBeInTheDocument();
    expect(screen.getByText(unresolved.rowBody(2))).toBeInTheDocument();
    const press = screen.getByRole("button", { name: unresolved.bannerActionAria });
    expect(within(press).getByText(unresolved.bannerActionShort)).toBeInTheDocument();
    fireEvent.click(press);
    expect(onLook).toHaveBeenCalledOnce();
  });

  it("says one line in the singular", () => {
    render(<UnresolvedRow count={1} next onLook={vi.fn()} />);
    expect(screen.getByText(unresolved.rowTitle(1))).toBeInTheDocument();
    expect(screen.getByText(unresolved.rowBody(1))).toBeInTheDocument();
  });
});

describe("FillFailedRow", () => {
  it("draws the shipped heading and body, with the short verb named in full", () => {
    draw({ ...QUIET, filled: false, cards: 0 });
    expect(screen.getByText(fill.failedHeading)).toBeInTheDocument();
    expect(screen.getByText(fill.failedBody)).toBeInTheDocument();
    const press = screen.getByRole("button", { name: fill.failedRetryAria });
    expect(within(press).getByText(fill.failedRetryShort)).toBeInTheDocument();
  });

  // Moved from FillFailedBannerConnected: an escaped rejection reaches an error boundary and takes
  // the retry away with it — the one control the row exists to offer.
  it("keeps the row and re-enables the retry when the fill action rejects", async () => {
    const { fillDeck } = await import("../../app/decks/actions");
    vi.mocked(fillDeck).mockRejectedValue(new Error("network"));
    draw({ ...QUIET, filled: false, cards: 0 });

    fireEvent.click(screen.getByRole("button", { name: fill.failedRetryAria }));

    await waitFor(() => expect(fillDeck).toHaveBeenCalledWith("deck-1"));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: fill.failedRetryAria })).not.toBeDisabled(),
    );
    expect(screen.getByText(fill.failedHeading)).toBeInTheDocument();
  });
});

describe("PendingRow", () => {
  const pending = deckVersioningCopy.pending;
  const draft = {
    ...COMMITTED,
    addChanges: [{ oracleId: "a", from: 0, to: 1 }, { oracleId: "b", from: 0, to: 1 }],
    adds: [
      { oracleId: "a", needed: 1, shortfall: 0, bucket: "free" as const, heldBy: [] },
      { oracleId: "b", needed: 1, shortfall: 0, bucket: "free" as const, heldBy: [] },
    ],
    removes: [{ oracleId: "c", from: 1, to: 0 }],
  };

  it("titles the row with the changes since the version and their two sides", () => {
    render(<PendingRow state={draft} deckId="deck-1" next />);
    expect(screen.getByText(pending.counts(2, 0))).toBeInTheDocument();
    expect(screen.getByText(pending.counts(0, 1))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`^${pending.since(3, 1)}`))).toBeInTheDocument();
  });

  // Commit and Discard live in Review, so the one press goes where the banner's review link went.
  it("links its one press to Review, named in full", () => {
    render(<PendingRow state={draft} deckId="deck-1" next />);
    const press = screen.getByRole("link", { name: pending.reviewCta(3) });
    expect(press).toHaveAttribute("href", "/decks/deck-1/changes");
    expect(press).toHaveTextContent(pending.reviewShort);
    expect(screen.queryByRole("link", { name: pending.commitCta(2) })).toBeNull();
    expect(screen.queryByRole("button", { name: pending.discardCta })).toBeNull();
  });

  it("names the version a commit makes when it is the next step, and both acts otherwise", () => {
    const { rerender } = render(<PendingRow state={draft} deckId="deck-1" next />);
    expect(screen.getByText(pending.rowBodyNext(3, 2))).toBeInTheDocument();
    rerender(<PendingRow state={draft} deckId="deck-1" next={false} />);
    expect(screen.getByText(pending.rowBody(3))).toBeInTheDocument();
  });

  it("says it, not them, for one change", () => {
    expect(pending.rowBody(1)).toBe("Commit or discard it in Review.");
    expect(pending.rowBodyNext(1, 4)).toBe("Commit it as v4 in Review.");
  });
});

describe("OverRow", () => {
  const cuts = tuningHubShortcutsCopy;

  it("leads with +N, says the overage in words, and opens Proposed cuts from Cuts", () => {
    const open = vi.fn();
    anchors.length = 0;
    render(<OverRow over={5} bodySize={99} next onProposedCuts={open} />);
    expect(screen.getByText(overCopy.figure.delta("5"))).toBeInTheDocument();
    expect(screen.getByText("Five over the ninety-nine")).toBeInTheDocument();
    expect(screen.getByText("Cut five and it is legal.")).toBeInTheDocument();
    const press = screen.getByRole("button", { name: cuts.proposedCutsAria });
    expect(press).toHaveTextContent(cuts.proposedCutsShort);
    fireEvent.click(press);
    expect(open).toHaveBeenCalledTimes(1);
    // M3 once, on this press: the spines no longer register it.
    expect(anchors.filter((a) => a.id === "proposed-cuts")).toEqual([{ id: "proposed-cuts", eligible: true }]);
  });

  it("names a pair's body, never a literal ninety-nine", () => {
    render(<OverRow over={1} bodySize={98} next={false} />);
    expect(screen.getByText("One over the ninety-eight")).toBeInTheDocument();
  });

  it("draws no press with Proposed cuts' switch off, and M3 has nothing to anchor to", () => {
    anchors.length = 0;
    render(<OverRow over={2} bodySize={99} next={false} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("Two over the ninety-nine")).toBeInTheDocument();
    expect(anchors).toEqual([{ id: "proposed-cuts", eligible: false }]);
  });

  it("is a warning: the over ink on its title, and --fg when it is the next step", () => {
    const { unmount } = render(<OverRow over={2} bodySize={99} next={false} />);
    const rest = screen.getByText("Two over the ninety-nine").className;
    expect(rest).toContain("text-[color:var(--avail-over-fg)]");
    expect(rest).not.toContain("text-[color:var(--fg)]");
    unmount();
    render(<OverRow over={2} bodySize={99} next />);
    const lead = screen.getByText("Two over the ninety-nine").className;
    expect(lead).toContain("text-[color:var(--fg)]");
    expect(lead).not.toContain("var(--avail-over-fg)");
  });
});

describe("SpokenForTwiceRow", () => {
  const s = availabilityCopy.deckSummary;

  it("names one card, and says it in Shopping", () => {
    const shop = vi.fn();
    render(<SpokenForTwiceRow count={1} card={{ name: "Sol Ring", deckCount: 3, ownedQty: 2 }} onShowShopping={shop} />);
    expect(screen.getByText(s.headingOne("Sol Ring"))).toBeInTheDocument();
    expect(screen.getByText("It’s on 3 committed decks and you own 2.")).toBeInTheDocument();
    const press = screen.getByRole("button", { name: "See it in Shopping" });
    expect(press).toHaveTextContent(s.press);
    fireEvent.click(press);
    expect(shop).toHaveBeenCalledTimes(1);
  });

  it("counts many, with the body that is true of three", () => {
    render(<SpokenForTwiceRow count={3} card={null} onShowShopping={vi.fn()} />);
    expect(screen.getByText(s.heading(3))).toBeInTheDocument();
    expect(screen.getByText(s.bodyManyShort)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "See them in Shopping" })).toBeInTheDocument();
  });

  it("is never the next step, and offers nothing while Shopping is showing", () => {
    render(<SpokenForTwiceRow count={2} card={null} />);
    expect(screen.queryByText(copy.nextStep)).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText(s.heading(2)).className).toContain("var(--avail-over-fg)");
  });
});
