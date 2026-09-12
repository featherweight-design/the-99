// The pull, and the two claims it is not offered on. What is tested here is
// which of the three arms a claim reaches and what each one hands the server —
// the figures in the success line are the action's, so the only assertion about
// them is that the control prints what it was given rather than arithmetic of
// its own.

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import type { DeckClaim } from "../../lib/decks/availability";
import { PullControl } from "./pull-control";

vi.mock("../../app/decks/actions", () => ({ pullCardFromDeck: vi.fn() }));
import { pullCardFromDeck } from "../../app/decks/actions";

const copy = deckVersioningCopy.review;
const CARD = { oracleId: "o1", name: "Sol Ring" };
const FREE_TO_PULL: DeckClaim = {
  id: "d2",
  name: "Atraxa",
  quantity: 1,
  mature: true,
  pending: false,
  commander: false,
};
const noop = () => {};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("PullControl", () => {
  it("offers the pull, and re-prints the arithmetic on success", async () => {
    vi.mocked(pullCardFromDeck).mockResolvedValue({ ok: true, buy: 7, total: "$241.00" });
    const onPulled = vi.fn();
    render(<PullControl deckId="d" card={CARD} claim={FREE_TO_PULL} onPulled={onPulled} />);
    await act(async () => {
      screen.getByRole("button", { name: copy.pull }).click();
    });
    // The source deck, the card, then the deck that gains the copy.
    expect(pullCardFromDeck).toHaveBeenCalledWith("d2", "o1", "d");
    expect(
      screen.getByText(
        deckVersioningCopy.commit.pullAnnounced("Sol Ring", "Atraxa", 7, "$241.00"),
      ),
    ).toBeTruthy();
    expect(onPulled).toHaveBeenCalledTimes(1);
  });

  it("replaces the action with a tag and a route when that deck has its own draft", () => {
    render(
      <PullControl
        deckId="d"
        card={CARD}
        claim={{ ...FREE_TO_PULL, pending: true }}
        onPulled={noop}
      />,
    );
    expect(screen.getByText(copy.pullGuardTag)).toBeTruthy();
    // A live link, not a disabled `Pull it`: that deck is the way forward.
    expect(screen.getByRole("link", { name: /Open it to release Sol Ring/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: copy.pull })).toBeNull();
  });

  it("offers no control at all on a commander claim — no route releases it", () => {
    render(
      <PullControl
        deckId="d"
        card={CARD}
        claim={{ ...FREE_TO_PULL, commander: true }}
        onPulled={noop}
      />,
    );
    expect(screen.getByText(copy.commanderGuardTag)).toBeTruthy();
    expect(screen.getByText(copy.commanderGuardA11y("Atraxa", "Sol Ring"))).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  // Both guards are permanent for as long as the claim is what it is, and a
  // commander guard is checked first because no route releases it. A claim that
  // is both lands on the commander arm.
  it("takes the commander arm over the pending one", () => {
    render(
      <PullControl
        deckId="d"
        card={CARD}
        claim={{ ...FREE_TO_PULL, commander: true, pending: true }}
        onPulled={noop}
      />,
    );
    expect(screen.getByText(copy.commanderGuardTag)).toBeTruthy();
    expect(screen.queryByText(copy.pullGuardTag)).toBeNull();
  });

  it("announces once, not once per re-render", async () => {
    vi.mocked(pullCardFromDeck).mockResolvedValue({ ok: true, buy: 7, total: "$241.00" });
    const view = render(
      <PullControl deckId="d" card={CARD} claim={FREE_TO_PULL} onPulled={noop} />,
    );
    await act(async () => {
      screen.getByRole("button", { name: copy.pull }).click();
    });
    // A re-render with the same props must not re-run the write or re-derive the
    // sentence — it is held in state for exactly that reason.
    view.rerender(<PullControl deckId="d" card={CARD} claim={FREE_TO_PULL} onPulled={noop} />);
    expect(pullCardFromDeck).toHaveBeenCalledTimes(1);
    expect(
      screen.getAllByText(
        deckVersioningCopy.commit.pullAnnounced("Sol Ring", "Atraxa", 7, "$241.00"),
      ),
    ).toHaveLength(1);
  });

  // The server's guards stay, and a refusal is the reader's to read: a pull can
  // be refused by an edit landing between the page rendering and the click.
  it("prints the server's refusal in place", async () => {
    vi.mocked(pullCardFromDeck).mockResolvedValue({
      ok: false,
      message: "That deck has pending changes. Release the card there.",
    });
    render(<PullControl deckId="d" card={CARD} claim={FREE_TO_PULL} onPulled={noop} />);
    await act(async () => {
      screen.getByRole("button", { name: copy.pull }).click();
    });
    expect(screen.getByRole("alert").textContent).toContain("Release the card there");
  });
});
