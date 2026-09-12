// The pull, and the two claims it is not offered on. What is tested here is
// which of the three arms a claim reaches and what each one hands the server —
// the figures in the success line are the action's, so the only assertion about
// them is that the control prints what it was given rather than arithmetic of
// its own.

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import type { DeckClaim } from "../../lib/decks/availability";
import { DECK_REMOVE_FALLBACK_MESSAGE } from "../../lib/decks/mutation-result";
import { cardDetailCopy } from "../cards/card-detail-provider";
import { DRAFT_ANNOUNCER_ID } from "./draft-announcer";
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

/** The review page's row, reduced to the two things a pull depends on: the card's
 *  own trigger, which survives the refresh, and the control, which does not. */
function Row({ pullable = true, onPulled = noop }: { pullable?: boolean; onPulled?: () => void }) {
  return (
    <div>
      <button type="button" aria-label={cardDetailCopy.triggerAria(CARD.name)}>
        {CARD.name}
      </button>
      {pullable && (
        <PullControl deckId="d" card={CARD} claim={FREE_TO_PULL} onPulled={onPulled} />
      )}
    </div>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  // The live region is deliberately outside React's tree, so `cleanup` does not
  // take it: a sentence left in it would be read as the next test's.
  document.getElementById(DRAFT_ANNOUNCER_ID)?.remove();
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

  // The server could not read the asking deck's buy count after the write. The
  // pull happened, so it is announced; the shopping is the one thing nobody can
  // speak to, and 0 there would call it finished.
  it("announces the pull and says nothing about buying when the count came back null", async () => {
    vi.mocked(pullCardFromDeck).mockResolvedValue({ ok: true, buy: null, total: null });
    render(<PullControl deckId="d" card={CARD} claim={FREE_TO_PULL} onPulled={noop} />);
    await act(async () => {
      screen.getByRole("button", { name: copy.pull }).click();
    });
    const region = screen.getByRole("status");
    expect(region.textContent).toBe(
      deckVersioningCopy.commit.pullAnnouncedBuyUnknown("Sol Ring", "Atraxa"),
    );
    expect(region.textContent).not.toContain("to buy");
    expect(region.textContent).not.toContain("0");
  });

  // The refreshed row is no longer a pullable one, so the control the reader was
  // standing on goes with it. Both the sentence and the reader's place have to
  // outlive that: the region is not in this component's subtree, and focus is on
  // the row's own trigger before the refresh is ever asked for.
  it("keeps the announcement and leaves focus on the row when the refreshed row drops the control", async () => {
    vi.mocked(pullCardFromDeck).mockResolvedValue({ ok: true, buy: 7, total: "$241.00" });
    const announced = deckVersioningCopy.commit.pullAnnounced("Sol Ring", "Atraxa", 7, "$241.00");
    const view = render(<Row />);
    await act(async () => {
      screen.getByRole("button", { name: copy.pull }).click();
    });
    const trigger = screen.getByRole("button", { name: cardDetailCopy.triggerAria("Sol Ring") });
    expect(document.activeElement).toBe(trigger);
    // The refresh, as the row's parent will draw it once the server answers.
    view.rerender(<Row pullable={false} />);
    expect(screen.queryByRole("button", { name: copy.pull })).toBeNull();
    expect(screen.getByRole("status").textContent).toBe(announced);
    expect(document.activeElement).toBe(trigger);
  });

  // A rejected action, not a refusal: a network or database failure, or the
  // server's ownership guard throwing. Without the catch the transition ends
  // silently and the click the reader is waiting on answers nothing.
  it("prints the deck mutation fallback when the action rejects", async () => {
    vi.mocked(pullCardFromDeck).mockRejectedValue(new Error("network"));
    render(<PullControl deckId="d" card={CARD} claim={FREE_TO_PULL} onPulled={noop} />);
    await act(async () => {
      screen.getByRole("button", { name: copy.pull }).click();
    });
    expect(screen.getByRole("alert").textContent).toBe(DECK_REMOVE_FALLBACK_MESSAGE);
    expect(screen.getByRole("button", { name: copy.pull })).toBeTruthy();
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
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  // Four letters and nothing spoken: the reason is the ROW's, carried in the name
  // trigger's description, and a second utterance here read the whole sentence
  // twice per row. `review-changes.test.tsx` owns the row's half of that.
  it("leaves the commander guard's reason to the row that mounts it", () => {
    render(
      <PullControl
        deckId="d"
        card={CARD}
        claim={{ ...FREE_TO_PULL, commander: true }}
        onPulled={noop}
      />,
    );
    const tag = screen.getByText(copy.commanderGuardTag);
    expect(tag.getAttribute("aria-hidden")).toBe("true");
    expect(screen.queryByLabelText(copy.commanderGuardA11y("Atraxa", "Sol Ring"))).toBeNull();
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
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Release the card there");
    // The shipped `MutationError`, which is a paragraph beneath the control, and
    // not a second refusal written inline beside it.
    expect(alert.tagName).toBe("P");
    // The row stays pullable: what refused it was a race, and the reader can act
    // on the advice and ask again.
    expect(screen.getByRole("button", { name: copy.pull })).toBeTruthy();
  });

  // Both actions stand in one box, so a guarded row is the same width and the
  // same height as a pullable one. Only the ink differs: the accent belongs to
  // the one control on this page that writes, and leaving for another deck is
  // navigation.
  it("gives the guard's route the pull's geometry and the reading ink", () => {
    render(<PullControl deckId="d" card={CARD} claim={FREE_TO_PULL} onPulled={noop} />);
    const pull = screen.getByRole("button", { name: copy.pull }).className;
    cleanup();
    render(
      <PullControl
        deckId="d"
        card={CARD}
        claim={{ ...FREE_TO_PULL, pending: true }}
        onPulled={noop}
      />,
    );
    const open = screen.getByRole("link", { name: /Open it to release Sol Ring/ }).className;
    for (const geometry of ["min-h-[44px]", "md:min-h-[34px]", "px-[16px]", "md:px-[11px]"]) {
      expect(pull).toContain(geometry);
      expect(open).toContain(geometry);
    }
    expect(pull).toContain("text-[color:var(--accent)]");
    expect(open).toContain("text-[color:var(--fg)]");
    expect(open).not.toContain("text-[color:var(--accent)]");
    // Sans on both, never the mono this page sets its meta in: these are controls.
    expect(pull).toContain("font-sans");
    expect(open).toContain("font-sans");
  });

  // The guard tag is the buy tag's shape — a bordered mono plate, not a fill of
  // its own — and it is grouped 5px from the action beside it, so a guarded row
  // is the same width class as a pullable one.
  it("draws the guard tag in the buy tag's shape", () => {
    const { container } = render(
      <PullControl
        deckId="d"
        card={CARD}
        claim={{ ...FREE_TO_PULL, pending: true }}
        onPulled={noop}
      />,
    );
    const tag = screen.getByText(copy.pullGuardTag);
    expect(tag.className).toContain("[border:1px_solid_var(--accent-shadow)]");
    expect(tag.className).toContain("tracking-[0.1em]");
    expect((container.firstElementChild as HTMLElement).className).toContain("gap-[5px]");
  });
});
