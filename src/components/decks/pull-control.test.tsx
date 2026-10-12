// The pull, and the two claims it is not offered on. What is tested here is
// which of the three arms a claim reaches and what each one hands the server —
// the figures in the success line are the action's, so the only assertion about
// them is that the control prints what it was given rather than arithmetic of
// its own.

import type { BrowseCard } from "../../lib/collection/browse";
import { lockedCardsCopy } from "../../lib/copy/locked-cards";
import { act, cleanup, fireEvent, render as rtlRender, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import type { DeckClaim } from "../../lib/decks/availability";
import { DECK_REMOVE_FALLBACK_MESSAGE } from "../../lib/decks/mutation-result";
import { CardDetailProvider, STACK_DROP_MS, cardDetailCopy, useCardDetail } from "../cards/card-detail-provider";
import { DRAFT_ANNOUNCER_ID } from "./draft-announcer";
import { PullControl } from "./pull-control";

vi.mock("../../app/decks/actions", () => ({ pullCardFromDeck: vi.fn() }));
vi.mock("../../app/collection/actions", () => ({
  setCardArtPreference: vi.fn(async () => true),
  clearCardArtPreference: vi.fn(async () => {}),
}));

// The source picker's phone sheet names itself to the card modal (stacked sheets R1, s5), so it is
// drawn, as in production on `/decks/[id]/changes`, inside a card-detail provider.
function Wrapper({ children }: { children: React.ReactNode }) {
  return <CardDetailProvider>{children}</CardDetailProvider>;
}
const render = (ui: React.ReactElement) => rtlRender(ui, { wrapper: Wrapper });
import { pullCardFromDeck } from "../../app/decks/actions";

const copy = deckVersioningCopy.review;
const sourceCopy = copy.source;
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
const OTHER_SOURCE: DeckClaim = {
  id: "d3",
  name: "Prismari Artistry",
  quantity: 1,
  mature: true,
  pending: true,
  commander: false,
  senior: true,
};
const LOCKED_SOURCE: DeckClaim = {
  id: "d4",
  name: "Atraxa Counters",
  quantity: 1,
  mature: true,
  pending: false,
  commander: false,
  senior: true,
  locked: true,
};
const noop = () => {};

// jsdom ships no matchMedia, and `useIsDesktop()` decides which of the popover /
// sheet is mounted — so a multi-source test has to declare a breakpoint, the
// same pattern `filter-panel.test.tsx` uses for its own popover/sheet split.
function setViewport(desktop: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: desktop,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

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
        <PullControl deckId="d" card={CARD} claims={[FREE_TO_PULL]} defaultId={FREE_TO_PULL.id} onPulled={onPulled} />
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
    render(<PullControl deckId="d" card={CARD} claims={[FREE_TO_PULL]} defaultId={FREE_TO_PULL.id} onPulled={onPulled} />);
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
    render(<PullControl deckId="d" card={CARD} claims={[FREE_TO_PULL]} defaultId={FREE_TO_PULL.id} onPulled={noop} />);
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
    render(<PullControl deckId="d" card={CARD} claims={[FREE_TO_PULL]} defaultId={FREE_TO_PULL.id} onPulled={noop} />);
    await act(async () => {
      screen.getByRole("button", { name: PULL_NAME }).click();
    });
    expect(screen.getByRole("alert").textContent).toBe(DECK_REMOVE_FALLBACK_MESSAGE);
    expect(screen.getByRole("button", { name: PULL_NAME })).toBeTruthy();
  });

  // Two words on screen, a sentence to a screen reader: a column of identical
  // `Pull it` names says nothing about which card leaves which deck.
  it("names the control for its card and its holder while printing the two words", () => {
    render(<PullControl deckId="d" card={CARD} claims={[FREE_TO_PULL]} defaultId={FREE_TO_PULL.id} onPulled={noop} />);
    const button = screen.getByRole("button", { name: PULL_NAME });
    expect(button.textContent).toBe(copy.pull);
    expect(PULL_NAME).not.toBe(copy.pull);
  });

  // A holder with a draft of its own is pullable (Hugh, 2026-09-27): the pull joins that draft
  // rather than committing it, so there is nothing of the owner's to sweep into a version.
  it("offers the pull on a holder that has a draft of its own", () => {
    render(
      <PullControl
        deckId="d"
        card={CARD}
        claims={[{ ...FREE_TO_PULL, pending: true }]} defaultId={FREE_TO_PULL.id}
        onPulled={noop}
      />,
    );
    expect(screen.getByRole("button", { name: PULL_NAME })).toBeTruthy();
  });

  it("offers no control at all on a commander claim — no route releases it", () => {
    render(
      <PullControl
        deckId="d"
        card={CARD}
        claims={[{ ...FREE_TO_PULL, commander: true }]} defaultId={FREE_TO_PULL.id}
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
        claims={[{ ...FREE_TO_PULL, commander: true }]} defaultId={FREE_TO_PULL.id}
        onPulled={noop}
      />,
    );
    const tag = screen.getByText(copy.commanderGuardTag);
    expect(tag.getAttribute("aria-hidden")).toBe("true");
    expect(screen.queryByLabelText(copy.commanderGuardA11y("Atraxa", "Sol Ring"))).toBeNull();
  });

  // A commander guard is checked first because no route releases it. A claim that is both a
  // commander and locked lands on the commander arm.
  it("takes the commander arm over the locked one", () => {
    render(
      <PullControl
        deckId="d"
        card={CARD}
        claims={[{ ...FREE_TO_PULL, commander: true, locked: true }]} defaultId={FREE_TO_PULL.id}
        onPulled={noop}
      />,
    );
    expect(screen.getByText(copy.commanderGuardTag)).toBeTruthy();
    expect(screen.queryByText(lockedCardsCopy.pull.tag)).toBeNull();
  });

  // L2: the player locked the card in the source deck. A tag and no control, its sentence left to
  // the row like the commander guard's. A holder's own draft does not lift it.
  it("draws the locked guard and no control, even on a holder with a draft", () => {
    render(
      <PullControl
        deckId="d"
        card={CARD}
        claims={[{ ...FREE_TO_PULL, locked: true, pending: true }]} defaultId={FREE_TO_PULL.id}
        onPulled={noop}
      />,
    );
    const tag = screen.getByText(lockedCardsCopy.pull.tag);
    expect(tag.getAttribute("aria-hidden")).toBe("true");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("announces once, not once per re-render", async () => {
    vi.mocked(pullCardFromDeck).mockResolvedValue({ ok: true, buy: 7, total: "$241.00" });
    const view = render(
      <PullControl deckId="d" card={CARD} claims={[FREE_TO_PULL]} defaultId={FREE_TO_PULL.id} onPulled={noop} />,
    );
    await act(async () => {
      screen.getByRole("button", { name: PULL_NAME }).click();
    });
    // A re-render with the same props must not re-run the write or re-derive the
    // sentence — it is held in state for exactly that reason.
    view.rerender(<PullControl deckId="d" card={CARD} claims={[FREE_TO_PULL]} defaultId={FREE_TO_PULL.id} onPulled={noop} />);
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
    render(<PullControl deckId="d" card={CARD} claims={[FREE_TO_PULL]} defaultId={FREE_TO_PULL.id} onPulled={noop} />);
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
    render(<PullControl deckId="d" card={CARD} claims={[FREE_TO_PULL]} defaultId={FREE_TO_PULL.id} onPulled={noop} />);
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
        claims={[{ ...FREE_TO_PULL, commander: true }]} defaultId={FREE_TO_PULL.id}
        onPulled={noop}
      />,
    );
    const tag = screen.getByText(copy.commanderGuardTag);
    expect(tag.className).toContain("[border:1px_solid_var(--accent-shadow)]");
    expect(tag.className).toContain("tracking-[0.1em]");
  });
});

// Addendum R1: a card held by two or more decks that can give it up opens a
// short list, rather than `pullCandidate()` picking silently.
describe("PullControl — 2+ choosable sources", () => {
  const MANY_NAME = copy.pullManyA11y(CARD.name, 2);

  it("offers the single-tap button, not the list, when only ONE source can be chosen", () => {
    // Design call 5: "one free source plus one locked is one" — a guard row
    // in the list does not turn this into a two-or-more case.
    render(
      <PullControl
        deckId="d"
        card={CARD}
        claims={[FREE_TO_PULL, { ...OTHER_SOURCE, locked: true }]}
        defaultId={FREE_TO_PULL.id}
        onPulled={noop}
      />,
    );
    expect(screen.getByRole("button", { name: PULL_NAME })).toBeTruthy();
    expect(screen.queryByRole("button", { name: MANY_NAME })).toBeNull();
    // The one-tap row behaves exactly as it did before this addendum existed:
    // the locked source is not drawn here at all, same as `pullCandidate`'s own
    // shipped behaviour (its releasable-claim check runs first and never sees it).
    expect(screen.queryByText(lockedCardsCopy.pull.tag)).toBeNull();
  });

  it("opens a dialog with a radiogroup, the default pick checked, when 2+ can be chosen", () => {
    setViewport(true);
    render(
      <PullControl
        deckId="d"
        card={CARD}
        claims={[FREE_TO_PULL, OTHER_SOURCE]}
        defaultId={FREE_TO_PULL.id}
        onPulled={noop}
      />,
    );
    act(() => {
      screen.getByRole("button", { name: MANY_NAME }).click();
    });
    expect(screen.getByRole("dialog")).toBeTruthy();
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(2);
    expect(radios.find((r) => r.getAttribute("aria-checked") === "true")?.id).toContain(
      FREE_TO_PULL.id,
    );
  });

  it("confirms the CHOSEN source, not the default one", async () => {
    setViewport(true);
    vi.mocked(pullCardFromDeck).mockResolvedValue({ ok: true, buy: 1, total: "$1.00" });
    render(
      <PullControl
        deckId="d"
        card={CARD}
        claims={[FREE_TO_PULL, OTHER_SOURCE]}
        defaultId={FREE_TO_PULL.id}
        onPulled={noop}
      />,
    );
    act(() => {
      screen.getByRole("button", { name: MANY_NAME }).click();
    });
    act(() => {
      screen.getByRole("radio", { name: new RegExp(OTHER_SOURCE.name) }).click();
    });
    await act(async () => {
      screen.getByRole("button", { name: sourceCopy.confirm(OTHER_SOURCE.name) }).click();
    });
    expect(pullCardFromDeck).toHaveBeenCalledWith(OTHER_SOURCE.id, CARD.oracleId, "d");
  });

  it("draws a locked or commander claim in the list as disabled, with its reason, never focusable", () => {
    setViewport(true);
    render(
      <PullControl
        deckId="d"
        card={CARD}
        claims={[FREE_TO_PULL, OTHER_SOURCE, LOCKED_SOURCE]}
        defaultId={FREE_TO_PULL.id}
        onPulled={noop}
      />,
    );
    act(() => {
      screen.getByRole("button", { name: MANY_NAME }).click();
    });
    const lockedRow = screen.getByRole("radio", { name: new RegExp(LOCKED_SOURCE.name) });
    expect(lockedRow.getAttribute("aria-disabled")).toBe("true");
    expect(lockedRow.getAttribute("tabindex")).toBe("-1");
    expect(screen.getByText(sourceCopy.lockedReason)).toBeTruthy();
  });

  it("stays open on a refusal, with the pick kept", async () => {
    setViewport(true);
    vi.mocked(pullCardFromDeck).mockResolvedValue({
      ok: false,
      message: "That deck has pending changes. Release the card there.",
    });
    render(
      <PullControl
        deckId="d"
        card={CARD}
        claims={[FREE_TO_PULL, OTHER_SOURCE]}
        defaultId={FREE_TO_PULL.id}
        onPulled={noop}
      />,
    );
    act(() => {
      screen.getByRole("button", { name: MANY_NAME }).click();
    });
    await act(async () => {
      screen.getByRole("button", { name: sourceCopy.confirm(FREE_TO_PULL.name) }).click();
    });
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("Release the card there");
  });

  // Design state 8: "Esc and scrim do nothing" while pulling. Found by Copilot's round-1
  // review: the outside-press listener closed over a stale `close` that still believed
  // nothing was pending, so a press landing during the write dismissed the list anyway.
  it("ignores an outside press while a pull is in flight", async () => {
    setViewport(true);
    let resolvePull: (r: Awaited<ReturnType<typeof pullCardFromDeck>>) => void;
    vi.mocked(pullCardFromDeck).mockReturnValue(
      new Promise((resolve) => {
        resolvePull = resolve;
      }),
    );
    render(
      <PullControl
        deckId="d"
        card={CARD}
        claims={[FREE_TO_PULL, OTHER_SOURCE]}
        defaultId={FREE_TO_PULL.id}
        onPulled={noop}
      />,
    );
    act(() => {
      screen.getByRole("button", { name: MANY_NAME }).click();
    });
    act(() => {
      screen.getByRole("button", { name: sourceCopy.confirm(FREE_TO_PULL.name) }).click();
    });
    // Still pending — the write has not resolved yet.
    fireEvent.pointerDown(document.body);
    expect(screen.getByRole("dialog")).toBeTruthy();
    await act(async () => {
      resolvePull({ ok: true, buy: 1, total: "$1.00" });
    });
  });

  it("disables the trigger itself while pulling, so it cannot be pressed to dismiss the list", async () => {
    setViewport(true);
    let resolvePull: (r: Awaited<ReturnType<typeof pullCardFromDeck>>) => void;
    vi.mocked(pullCardFromDeck).mockReturnValue(
      new Promise((resolve) => {
        resolvePull = resolve;
      }),
    );
    render(
      <PullControl
        deckId="d"
        card={CARD}
        claims={[FREE_TO_PULL, OTHER_SOURCE]}
        defaultId={FREE_TO_PULL.id}
        onPulled={noop}
      />,
    );
    act(() => {
      screen.getByRole("button", { name: MANY_NAME }).click();
    });
    act(() => {
      screen.getByRole("button", { name: sourceCopy.confirm(FREE_TO_PULL.name) }).click();
    });
    expect(screen.getByRole("button", { name: MANY_NAME })).toBeDisabled();
    await act(async () => {
      resolvePull({ ok: true, buy: 1, total: "$1.00" });
    });
  });

  it("names the chronological order under the title", () => {
    setViewport(true);
    render(
      <PullControl
        deckId="d"
        card={CARD}
        claims={[FREE_TO_PULL, OTHER_SOURCE]}
        defaultId={FREE_TO_PULL.id}
        onPulled={noop}
      />,
    );
    act(() => {
      screen.getByRole("button", { name: MANY_NAME }).click();
    });
    expect(screen.getByText(sourceCopy.order)).toBeTruthy();
  });

  // Design state 9: a refusal caused by the source going locked/commander in the meantime moves
  // the pick off a now-stale claim once fresher `claims` arrive (a parent refresh after the
  // refusal — `onPulled` is called on a refusal too, see `review-changes.test.tsx`).
  it("moves the pick off a claim that stops being choosable once fresher claims arrive", () => {
    setViewport(true);
    // A THIRD choosable claim, so choosableCount stays at 2 once FREE_TO_PULL locks — otherwise
    // the row would drop to the single-tap arm (design call 5) and the list would not be the
    // thing being asserted here.
    const THIRD: DeckClaim = { ...OTHER_SOURCE, id: "d5", name: "Third Source", pending: false };
    const view = render(
      <PullControl
        deckId="d"
        card={CARD}
        claims={[FREE_TO_PULL, OTHER_SOURCE, THIRD]}
        defaultId={FREE_TO_PULL.id}
        onPulled={noop}
      />,
    );
    act(() => {
      screen.getByRole("button", { name: copy.pullManyA11y(CARD.name, 3) }).click();
    });
    expect(
      screen.getByRole("radio", { name: new RegExp(FREE_TO_PULL.name) }).getAttribute("aria-checked"),
    ).toBe("true");
    // The server's fresh read: FREE_TO_PULL has gone locked.
    view.rerender(
      <PullControl
        deckId="d"
        card={CARD}
        claims={[{ ...FREE_TO_PULL, locked: true }, OTHER_SOURCE, THIRD]}
        defaultId={FREE_TO_PULL.id}
        onPulled={noop}
      />,
    );
    expect(
      screen.getByRole("radio", { name: new RegExp(OTHER_SOURCE.name) }).getAttribute("aria-checked"),
    ).toBe("true");
    expect(
      screen.getByRole("radio", { name: new RegExp(FREE_TO_PULL.name) }).getAttribute("aria-checked"),
    ).toBe("false");
  });

  // Bug batch 2026-10-12: the phone sheet's body takes the other sheets' inset (16 / 14 / 16), and
  // the desktop popover keeps its own box padding with no second inset inside it.
  it("insets the phone sheet's body, and leaves the popover's own padding alone", () => {
    const INSET = ["px-[16px]", "pt-[14px]", "pb-[16px]"];
    const insetOf = () => {
      // The order line, a direct child of the shared body column, whose parent is this shell's.
      const line = screen.getByText("In the order they committed it");
      return (line.parentElement!.parentElement!.className ?? "").split(/\s+/);
    };
    setViewport(false);
    const { unmount } = render(
      <PullControl deckId="d" card={CARD} claims={[FREE_TO_PULL, OTHER_SOURCE]} defaultId={FREE_TO_PULL.id} onPulled={noop} />,
    );
    act(() => {
      screen.getByRole("button", { name: MANY_NAME }).click();
    });
    expect(insetOf()).toEqual(expect.arrayContaining(INSET));
    unmount();

    setViewport(true);
    render(
      <PullControl deckId="d" card={CARD} claims={[FREE_TO_PULL, OTHER_SOURCE]} defaultId={FREE_TO_PULL.id} onPulled={noop} />,
    );
    act(() => {
      screen.getByRole("button", { name: MANY_NAME }).click();
    });
    const popover = insetOf();
    expect(popover).toContain("p-[14px]");
    expect(popover).not.toContain("px-[16px]");
  });

  // Found missing by Copilot's round-2 review: `Sheet` owns no focus trap or Escape handling of
  // its own — every caller wires `useDialogA11y` itself, and the mobile branch here did not.
  it("wires Escape to dismiss at phone width too", () => {
    setViewport(false);
    render(
      <PullControl
        deckId="d"
        card={CARD}
        claims={[FREE_TO_PULL, OTHER_SOURCE]}
        defaultId={FREE_TO_PULL.id}
        onPulled={noop}
      />,
    );
    act(() => {
      screen.getByRole("button", { name: MANY_NAME }).click();
    });
    expect(screen.getByRole("dialog")).toBeTruthy();
    act(() => {
      fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  // Stacked sheets R1, s5: the phone list's head opens the card, which names the list as the way
  // back and covers it; the list stays mounted with the reader's pick.
  it("opens the card from the phone list's head, named for the list, with the pick kept", async () => {
    setViewport(false);
    render(
      <CardDetailProvider fetchCard={async () => ({
        oracleId: "o1", name: "Sol Ring", typeLine: "Artifact", manaCost: "{1}", cmc: 1, oracleText: null, keywords: [],
        rarity: "uncommon", colorIdentity: [], imageUri: null, printedName: null, quantity: 1, printings: [], setCodes: [],
        primarySetCode: "", preferredPrinting: null,
      })}>
        <PullControl deckId="d" card={CARD} claims={[FREE_TO_PULL, OTHER_SOURCE]} defaultId={FREE_TO_PULL.id} onPulled={noop} />
      </CardDetailProvider>,
    );
    act(() => { screen.getByRole("button", { name: MANY_NAME }).click(); });
    const list = screen.getByRole("dialog");
    const radios = list.querySelectorAll('[role="radio"]');
    act(() => { fireEvent.click(radios[radios.length - 1]); });
    const picked = [...list.querySelectorAll('[role="radio"]')].findIndex((r) => r.getAttribute("aria-checked") === "true");
    const head = list.querySelector('p[id$="-title"] button') as HTMLElement;
    expect(head).toHaveTextContent("Sol Ring");
    await act(async () => { fireEvent.click(head); });
    const pill = screen.getByTestId("card-modal-back-mobile");
    expect(pill).toHaveTextContent(copy.source.backLabel);
    const cover = list.closest("[data-hidden-under-card]");
    expect(cover).toHaveAttribute("aria-hidden", "true");
    await act(async () => { fireEvent.click(pill); });
    // The card drops before it closes on the phone (stacked sheets R1, motion).
    await act(() => new Promise<void>((r) => { setTimeout(r, STACK_DROP_MS); }));
    expect(list.closest("[data-hidden-under-card]")).toBeNull();
    expect([...list.querySelectorAll('[role="radio"]')].findIndex((r) => r.getAttribute("aria-checked") === "true")).toBe(picked);
  });

  // #1267 round 1: the phone list's head is a card trigger with the row trigger's own name, and the
  // review row draws the control in a separate div, so the lookup met the head first.
  it("returns focus to the row's trigger after a phone pull, never the list head's", async () => {
    setViewport(false);
    vi.mocked(pullCardFromDeck).mockResolvedValue({ ok: true, buy: 1, total: "$1.00" });
    render(
      <div>
        <div>
          <button type="button" aria-label={cardDetailCopy.triggerAria(CARD.name)}>{CARD.name}</button>
        </div>
        <div>
          <PullControl deckId="d" card={CARD} claims={[FREE_TO_PULL, OTHER_SOURCE]} defaultId={FREE_TO_PULL.id} onPulled={noop} />
        </div>
      </div>,
    );
    act(() => { screen.getByRole("button", { name: MANY_NAME }).click(); });
    await act(async () => {
      screen.getByRole("button", { name: sourceCopy.confirm(FREE_TO_PULL.name) }).click();
    });
    const row = screen.getAllByRole("button", { name: cardDetailCopy.triggerAria(CARD.name) })[0];
    expect(row.closest('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(row);
  });

  const solRing = {
    oracleId: "o1", name: "Sol Ring", typeLine: "Artifact", manaCost: "{1}", cmc: 1, oracleText: null, keywords: [],
    rarity: "uncommon", colorIdentity: [], imageUri: null, printedName: null, quantity: 1, printings: [], setCodes: [],
    primarySetCode: "", preferredPrinting: null,
  } as unknown as BrowseCard;
  const cardUp = () => document.querySelector('[aria-labelledby="card-modal-title"]');

  // #1267 round 1: a card the list's head asked for, still reading when the list goes, must not
  // arrive afterwards over a page with no list to return to.
  it("abandons the head's card when the list is dismissed before it arrives", async () => {
    setViewport(false);
    let land: (c: BrowseCard | null) => void = () => {};
    render(
      <CardDetailProvider fetchCard={() => new Promise<BrowseCard | null>((r) => { land = r; })}>
        <PullControl deckId="d" card={CARD} claims={[FREE_TO_PULL, OTHER_SOURCE]} defaultId={FREE_TO_PULL.id} onPulled={noop} />
      </CardDetailProvider>,
    );
    act(() => { screen.getByRole("button", { name: MANY_NAME }).click(); });
    const head = screen.getByRole("dialog").querySelector('p[id$="-title"] button') as HTMLElement;
    act(() => { fireEvent.click(head); });
    act(() => { screen.getByRole("button", { name: sourceCopy.cancel }).click(); });
    expect(screen.queryByRole("dialog")).toBeNull();
    await act(async () => { land(solRing); });
    expect(cardUp()).toBeNull();
  });

  // #1267 round 2: a combo partner reached from All details replaces the card in place, and it is
  // still the list's card session when the phone turns.
  it("closes a partner that replaced the head's card when the sheet gives way to the popover", async () => {
    setViewport(false);
    const partner = { ...solRing, oracleId: "o2", name: "Mana Vault" } as BrowseCard;
    function Partner() {
      const { open } = useCardDetail();
      return <button type="button" onClick={() => open("o2")}>partner</button>;
    }
    const ui = (
      <CardDetailProvider fetchCard={async (id) => (id === "o2" ? partner : solRing)}>
        <PullControl deckId="d" card={CARD} claims={[FREE_TO_PULL, OTHER_SOURCE]} defaultId={FREE_TO_PULL.id} onPulled={noop} />
        <Partner />
      </CardDetailProvider>
    );
    const view = render(ui);
    act(() => { screen.getByRole("button", { name: MANY_NAME }).click(); });
    const head = screen.getByRole("dialog").querySelector('p[id$="-title"] button') as HTMLElement;
    await act(async () => { fireEvent.click(head); });
    await act(async () => { fireEvent.click(screen.getByText("partner")); });
    expect(document.getElementById("card-modal-title")).toHaveTextContent("Mana Vault");
    setViewport(true);
    await act(async () => { view.rerender(ui); window.dispatchEvent(new Event("resize")); });
    expect(cardUp()).toBeNull();
  });

  // #1267 round 1: a phone turned past 768 swaps the list's sheet for the popover; the card the
  // sheet opened goes with it rather than staying up with no list under it.
  it("closes the head's card when the sheet gives way to the popover", async () => {
    setViewport(false);
    const ui = (
      <CardDetailProvider fetchCard={async () => solRing}>
        <PullControl deckId="d" card={CARD} claims={[FREE_TO_PULL, OTHER_SOURCE]} defaultId={FREE_TO_PULL.id} onPulled={noop} />
      </CardDetailProvider>
    );
    const view = render(ui);
    act(() => { screen.getByRole("button", { name: MANY_NAME }).click(); });
    const head = screen.getByRole("dialog").querySelector('p[id$="-title"] button') as HTMLElement;
    await act(async () => { fireEvent.click(head); });
    expect(cardUp()).not.toBeNull();
    setViewport(true);
    await act(async () => { view.rerender(ui); window.dispatchEvent(new Event("resize")); });
    expect(cardUp()).toBeNull();
  });

  // Found by Copilot's round-2 review: `useDialogA11y`'s own default returns focus to the
  // POPOVER trigger on unmount, undoing a manual focus call made just before closing it.
  it("leaves focus on the row's card trigger after a successful pull from the list", async () => {
    setViewport(true);
    vi.mocked(pullCardFromDeck).mockResolvedValue({ ok: true, buy: 1, total: "$1.00" });
    render(
      <div>
        <button type="button" aria-label={cardDetailCopy.triggerAria(CARD.name)}>
          {CARD.name}
        </button>
        <PullControl
          deckId="d"
          card={CARD}
          claims={[FREE_TO_PULL, OTHER_SOURCE]}
          defaultId={FREE_TO_PULL.id}
          onPulled={noop}
        />
      </div>,
    );
    act(() => {
      screen.getByRole("button", { name: MANY_NAME }).click();
    });
    await act(async () => {
      screen.getByRole("button", { name: sourceCopy.confirm(FREE_TO_PULL.name) }).click();
    });
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: cardDetailCopy.triggerAria(CARD.name) }),
    );
  });

  // Found by Copilot's round-3 review: starting at exactly 2 choosable sources, a refusal
  // caused by the CHOSEN one going locked/commander drops choosableCount to 1 on the next read —
  // recomputing the single-tap/list gate fresh on that render used to switch the whole subtree
  // to the one-tap arm, unmounting the open list and discarding the refusal with it.
  it("keeps the list open across a 2-to-1 choosable drop mid-session, rather than switching to the single-tap arm", () => {
    setViewport(true);
    const view = render(
      <PullControl
        deckId="d"
        card={CARD}
        claims={[FREE_TO_PULL, OTHER_SOURCE]}
        defaultId={FREE_TO_PULL.id}
        onPulled={noop}
      />,
    );
    act(() => {
      screen.getByRole("button", { name: MANY_NAME }).click();
    });
    expect(screen.getByRole("dialog")).toBeTruthy();
    // The server's fresh read: FREE_TO_PULL (the one claim) has gone locked, leaving only
    // OTHER_SOURCE choosable — `claims.filter(choosable).length` is now 1.
    view.rerender(
      <PullControl
        deckId="d"
        card={CARD}
        claims={[{ ...FREE_TO_PULL, locked: true }, OTHER_SOURCE]}
        defaultId={FREE_TO_PULL.id}
        onPulled={noop}
      />,
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(
      screen.getByRole("radio", { name: new RegExp(OTHER_SOURCE.name) }).getAttribute("aria-checked"),
    ).toBe("true");
  });

  // Found by Copilot's round-3 review: a successful pull's return-focus target survived in the
  // ref after the row (still 2+ sources) kept this same component instance mounted, so the NEXT
  // session's own cancel reused the stale card-trigger target instead of this session's trigger.
  it("does not reuse a prior pull's focus target on a later session's cancel", async () => {
    setViewport(true);
    vi.mocked(pullCardFromDeck).mockResolvedValue({ ok: true, buy: 1, total: "$1.00" });
    render(
      <div>
        <button type="button" aria-label={cardDetailCopy.triggerAria(CARD.name)}>
          {CARD.name}
        </button>
        <PullControl
          deckId="d"
          card={CARD}
          claims={[FREE_TO_PULL, OTHER_SOURCE, { ...OTHER_SOURCE, id: "d5", name: "Third Source" }]}
          defaultId={FREE_TO_PULL.id}
          onPulled={noop}
        />
      </div>,
    );
    const manyName3 = copy.pullManyA11y(CARD.name, 3);
    act(() => {
      screen.getByRole("button", { name: manyName3 }).click();
    });
    await act(async () => {
      screen.getByRole("button", { name: sourceCopy.confirm(FREE_TO_PULL.name) }).click();
    });
    // Re-open the same control for a second pull, then cancel it. The `claims` prop is static in
    // this test (no parent re-render), so the trigger's own label is unchanged. Focused
    // explicitly first: a bare `.click()` does not reliably move jsdom's own focus the way a
    // real click does, and the dialog's own pre-open capture needs it to be deterministic here.
    const trigger = screen.getByRole("button", { name: manyName3 });
    act(() => {
      trigger.focus();
      trigger.click();
    });
    act(() => {
      screen.getByRole("button", { name: sourceCopy.cancel }).click();
    });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: manyName3 }));
  });

  // Found by Copilot's round-4 review: the round-3 fix for the refusal case was too sticky — it
  // also survived a SUCCESSFUL pull that left exactly one source behind, which should return to
  // the one-tap path rather than opening a dialog whose own label says "choose from 1 deck."
  it("returns to the single-tap path after a successful pull leaves exactly one source", async () => {
    setViewport(true);
    vi.mocked(pullCardFromDeck).mockResolvedValue({ ok: true, buy: 1, total: "$1.00" });
    const view = render(
      <PullControl
        deckId="d"
        card={CARD}
        claims={[FREE_TO_PULL, OTHER_SOURCE]}
        defaultId={FREE_TO_PULL.id}
        onPulled={noop}
      />,
    );
    act(() => {
      screen.getByRole("button", { name: MANY_NAME }).click();
    });
    await act(async () => {
      screen.getByRole("button", { name: sourceCopy.confirm(FREE_TO_PULL.name) }).click();
    });
    // The server's fresh read after the pull: only OTHER_SOURCE is left.
    view.rerender(
      <PullControl
        deckId="d"
        card={CARD}
        claims={[OTHER_SOURCE]}
        defaultId={OTHER_SOURCE.id}
        onPulled={noop}
      />,
    );
    expect(
      screen.getByRole("button", { name: deckVersioningCopy.review.pullA11y(CARD.name, OTHER_SOURCE.name) }),
    ).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
