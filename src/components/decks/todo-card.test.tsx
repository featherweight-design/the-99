import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { deckImportCopy } from "../../lib/copy/deck-import";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import { guidedBannerCopy } from "../../lib/copy/decks-builder";
import { recommendationsCopy } from "../../lib/copy/recommendations";
import { COMMITTED } from "./__fixtures__/draft-state";
import { deckTodo, type TodoFacts } from "../../lib/decks/todo";

vi.mock("../../app/decks/actions", () => ({ fillDeck: vi.fn() }));

const { TodoCard, FillFailedRow, UnresolvedRow, PendingRow } = await import("./todo-card");

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
    expect(screen.getByText(pending.rowBodyNext(2))).toBeInTheDocument();
    rerender(<PendingRow state={draft} deckId="deck-1" next={false} />);
    expect(screen.getByText(pending.rowBody)).toBeInTheDocument();
  });
});
