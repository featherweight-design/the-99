// The pull, and the two claims it is not offered on. What is tested here is
// which of the three arms a claim reaches and what each one hands the server —
// the figures in the success line are the action's, so the only assertion about
// them is that the control prints what it was given rather than arithmetic of
// its own.

import { lockedCardsCopy } from "../../lib/copy/locked-cards";
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
  senior: true,
};
const noop = () => {};

/** The control's accessible name, which is not its visible words: `Pull it`
 *  repeats down the column and says nothing about which card leaves which deck. */
const PULL_NAME = copy.pullA11y(CARD.name, FREE_TO_PULL.name);

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
      screen.getByRole("button", { name: PULL_NAME }).click();
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
      screen.getByRole("button", { name: PULL_NAME }).click();
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
      screen.getByRole("button", { name: PULL_NAME }).click();
    });
    const trigger = screen.getByRole("button", { name: cardDetailCopy.triggerAria("Sol Ring") });
    expect(document.activeElement).toBe(trigger);
    // The refresh, as the row's parent will draw it once the server answers.
    view.rerender(<Row pullable={false} />);
    expect(screen.queryByRole("button", { name: PULL_NAME })).toBeNull();
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
      screen.getByRole("button", { name: PULL_NAME }).click();
    });
    expect(screen.getByRole("alert").textContent).toBe(DECK_REMOVE_FALLBACK_MESSAGE);
    expect(screen.getByRole("button", { name: PULL_NAME })).toBeTruthy();
  });

  // Two words on screen, a sentence to a screen reader: a column of identical
  // `Pull it` names says nothing about which card leaves which deck.
  it("names the control for its card and its holder while printing the two words", () => {
    render(<PullControl deckId="d" card={CARD} claim={FREE_TO_PULL} onPulled={noop} />);
    const button = screen.getByRole("button", { name: PULL_NAME });
    expect(button.textContent).toBe(copy.pull);
    expect(PULL_NAME).not.toBe(copy.pull);
  });

  // The tag and nothing else. It drew an `Open →` link to the holding deck, and
  // that link is what broke the desktop row: every item on the plate is
  // unshrinkable except the card name, so an anchor here took its width out of
  // the name until the name reached zero and the row printed no card at all.
  it("replaces the action with a tag and no control when that deck has its own draft", () => {
    render(
      <PullControl
        deckId="d"
        card={CARD}
        claim={{ ...FREE_TO_PULL, pending: true }}
        onPulled={noop}
      />,
    );
    expect(screen.getByText(copy.pullGuardTag)).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  // The tag says whose draft it is. A bare `pending` beside a card name was read
  // as a pending change to that CARD, on a row where the card is untouched.
  it("names the deck in the guard tag rather than the state alone", () => {
    expect(copy.pullGuardTag).toContain("deck");
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

  // L2: the player locked the card in the source deck. A tag and no control, its sentence left to
  // the row like the other two guards', and ahead of pending, since a commit would not free it.
  it("draws the locked guard and no control, ahead of pending", () => {
    render(
      <PullControl
        deckId="d"
        card={CARD}
        claim={{ ...FREE_TO_PULL, locked: true, pending: true }}
        onPulled={noop}
      />,
    );
    const tag = screen.getByText(lockedCardsCopy.pull.tag);
    expect(tag.getAttribute("aria-hidden")).toBe("true");
    expect(screen.queryByText(copy.pullGuardTag)).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("announces once, not once per re-render", async () => {
    vi.mocked(pullCardFromDeck).mockResolvedValue({ ok: true, buy: 7, total: "$241.00" });
    const view = render(
      <PullControl deckId="d" card={CARD} claim={FREE_TO_PULL} onPulled={noop} />,
    );
    await act(async () => {
      screen.getByRole("button", { name: PULL_NAME }).click();
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
      screen.getByRole("button", { name: PULL_NAME }).click();
    });
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Release the card there");
    // The shipped `MutationError`, which is a paragraph beneath the control, and
    // not a second refusal written inline beside it.
    expect(alert.tagName).toBe("P");
    // The row stays pullable: what refused it was a race, and the reader can act
    // on the advice and ask again.
    expect(screen.getByRole("button", { name: PULL_NAME })).toBeTruthy();
  });

  // The pull's own box: a 44px target on the phone, 34px above it, in the accent
  // that belongs to the one control on this page that writes. Sans, never the
  // mono this page sets its meta in — this is a control, not a figure.
  it("gives the pull a phone-sized target in the writing accent", () => {
    render(<PullControl deckId="d" card={CARD} claim={FREE_TO_PULL} onPulled={noop} />);
    const pull = screen.getByRole("button", { name: PULL_NAME }).className;
    for (const geometry of ["min-h-[44px]", "md:min-h-[34px]", "px-[16px]", "md:px-[11px]"]) {
      expect(pull).toContain(geometry);
    }
    expect(pull).toContain("text-[color:var(--accent)]");
    expect(pull).toContain("font-sans");
  });

  // The guard tag is the buy tag's shape — a bordered mono plate, not a fill of
  // its own.
  it("draws the guard tag in the buy tag's shape", () => {
    render(
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
  });
});
