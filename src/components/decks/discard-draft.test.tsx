// Discard — the confirm, and what it has to say before the only copy of the
// draft is overwritten. What is asserted here is the size of the loss (in the
// question and on the button), the version it lands on, which answer wears the
// brass fill, where focus goes on each way out, and that a refused write leaves
// the draft alone.

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import type { DraftState } from "../../lib/decks/draft-shape";
import { DRAFT_ANNOUNCER_ID } from "./draft-announcer";
import { COMMITTED } from "./__fixtures__/draft-state";
import { DiscardConfirm, DiscardTrigger, useDiscardConfirm } from "./discard-draft";

vi.mock("../../app/decks/actions", () => ({ discardDeckDraft: vi.fn() }));
import { discardDeckDraft } from "../../app/decks/actions";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const copy = deckVersioningCopy.discard;

/** v2 behind the draft, committed 1 Sep — the version every sentence names. */
const VERSION = { ...COMMITTED.version!, number: 2 };
const DATE = "1 Sep 2026";
/** The version's own size, which is why it is a prop: the draft's changes say
 *  nothing about how many cards the list behind them holds. */
const VERSION_CARDS = 99;

/** Nineteen in, seventeen out — the 36-change draft the design draws. */
const STATE_36: DraftState = {
  ...COMMITTED,
  version: VERSION,
  adds: Array.from({ length: 19 }, (_, i) => ({
    oracleId: `o${i}`,
    needed: 1,
    shortfall: 1,
    bucket: "unowned" as const,
    heldBy: [],
  })),
  addChanges: Array.from({ length: 19 }, (_, i) => ({ oracleId: `o${i}`, from: 0, to: 1 })),
  removes: Array.from({ length: 17 }, (_, i) => ({ oracleId: `c${i}`, from: 1, to: 0 })),
};

/** What the surface around the question is: the body the question replaces.
 *  Named so a test can say it went. */
const BODY = "the draft's own account";

/**
 * A host, because the question replaces its host's body and the flag between
 * them therefore lives in the host.
 *
 * This is the shape both real hosts take — `pending-banner.tsx` with its card,
 * `review-changes.tsx` with its apply bar — assembled here so this suite can
 * exercise the three exports together without either page's figures. That the
 * banner's own body goes is asserted in `pending-banner.test.tsx`, against the
 * banner.
 */
function Host({
  state = STATE_36,
  onDiscarded,
  onWriteState,
}: {
  state?: DraftState;
  onDiscarded?: () => void;
  onWriteState?: (next: "writing" | "settled" | "unknown") => void;
}) {
  const discard = useDiscardConfirm(state);
  if (discard.confirming) {
    return (
      <DiscardConfirm
        deckId="d"
        state={state}
        versionCards={VERSION_CARDS}
        onCancel={discard.cancel}
        onDiscarded={onDiscarded}
        onWriteState={onWriteState}
      />
    );
  }
  return (
    <div>
      <p>{BODY}</p>
      {discard.offered && (
        <DiscardTrigger onOpen={discard.open} triggerRef={discard.triggerRef} />
      )}
    </div>
  );
}

function discard(over: Partial<Parameters<typeof Host>[0]> = {}) {
  return render(<Host onDiscarded={vi.fn()} {...over} />);
}

/** The spine's heading, which is where focus lands on a successful discard. It
 *  belongs to a component well above this one, so the suite puts a real one in
 *  the document rather than asserting against a stand-in this control invented. */
function deckName(): HTMLElement {
  const h1 = document.createElement("h1");
  h1.textContent = "Korvold Treasure";
  document.body.appendChild(h1);
  return h1;
}

function raise() {
  screen.getByRole("button", { name: deckVersioningCopy.pending.discardCta }).click();
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  // Both live outside React's tree, so `cleanup` takes neither: an announcement
  // left behind would be read as the next test's, and a leftover heading would
  // be the one the next test's focus lands on.
  document.getElementById(DRAFT_ANNOUNCER_ID)?.remove();
  document.querySelectorAll("h1").forEach((h) => h.remove());
});

describe("the discard confirm", () => {
  // The question is asked in the place the body was, not beside the control that
  // raised it: a confirm standing in a controls row leaves the figures it is about
  // to throw away drawn underneath the question about throwing them away.
  it("takes the body of the surface that raised it", () => {
    discard();
    act(raise);
    expect(screen.queryByText(BODY)).toBeNull();
    expect(
      screen.queryByRole("button", { name: deckVersioningCopy.pending.discardCta }),
    ).toBeNull();
  });

  it("asks first, with the count in the question and on the button", () => {
    discard();
    // The confirm is not up until it is asked for. `queryByRole`, not a thrown
    // `getByRole` swallowed by a `.catch` — a swallowed throw passes whether the
    // control is absent or the query itself was wrong.
    expect(screen.queryByRole("button", { name: copy.cancel })).toBeNull();
    act(raise);
    expect(screen.getByText(copy.question(36))).toBeTruthy();
    expect(screen.getByRole("button", { name: copy.confirm(36) })).toBeTruthy();
    expect(discardDeckDraft).not.toHaveBeenCalled();
  });

  it("states what is lost, including that it is stored nowhere", () => {
    discard();
    act(raise);
    const sentence = copy.consequence(2, DATE, VERSION_CARDS, 19, 17);
    // The version clause is drawn at 600 inside the sentence, so the paragraph's
    // text is asserted rather than a single text node: the run is one element and
    // the words around it another.
    const why = screen.getByText(/not stored anywhere/);
    expect(why.textContent).toBe(sentence);
    expect(why.textContent).toContain(`v2 as committed on ${DATE}: 99 cards`);
    expect(why.querySelector("b")?.textContent).toBe(`v2 as committed on ${DATE}`);
    // Both answers point at it: the question repeats the destructive button's own
    // label, so describing the buttons with it would say the same words twice.
    for (const name of [copy.confirm(36), copy.cancel]) {
      expect(screen.getByRole("button", { name }).getAttribute("aria-describedby")).toBe(why.id);
    }
  });

  it("gives the brass fill to Keep editing, not to the destructive answer", () => {
    discard();
    act(raise);
    const keep = screen.getByRole("button", { name: copy.cancel });
    const kill = screen.getByRole("button", { name: copy.confirm(36) });
    expect(keep.className).toContain("bg-[color:var(--fg)]");
    expect(kill.className).toContain("text-[color:var(--danger)]");
    // Danger on the border and the ink only: a filled red plate would make the
    // unrecoverable answer the recommended one.
    expect(kill.className).toContain("bg-transparent");
    expect(kill.className).not.toContain("bg-[color:var(--danger)]");
  });

  // At 390px the pair stacks and the safe answer sits on top; on desktop the row
  // reads from the act to the way out. One element ordered twice, never a phone
  // copy beside a desktop one — a doubled subtree reads as a match on both
  // columns. The stack is the DOM order and desktop is what reverses, so the
  // phone's reading order, tab order and visual order are one order.
  it("stacks the pair with the safe answer on top, in one element", () => {
    discard();
    act(raise);
    const row = screen.getByRole("button", { name: copy.cancel }).parentElement!;
    expect(row.className).toContain("flex-col");
    expect(row.className).not.toContain("flex-col-reverse");
    expect(row.className).toContain("md:flex-row-reverse");
    expect(screen.getAllByRole("button", { name: copy.cancel })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: copy.confirm(36) })).toHaveLength(1);
  });

  // The way out is the first tab stop at both widths. Reversing the phone stack
  // into place instead would leave the destructive answer ahead of it in the DOM,
  // reachable only by tabbing backwards out of the confirm.
  it("puts the way out ahead of the destructive answer in the DOM", () => {
    discard();
    act(raise);
    const row = screen.getByRole("button", { name: copy.cancel }).parentElement!;
    const order = Array.from(row.querySelectorAll("button")).map((b) => b.textContent);
    expect(order).toEqual([copy.cancel, copy.confirm(36)]);
  });

  it("returns focus to the trigger on cancel", () => {
    discard();
    act(raise);
    // Focus enters on the safe answer, so a held Enter cannot carry a reader
    // through the unrecoverable one.
    expect(document.activeElement).toBe(screen.getByRole("button", { name: copy.cancel }));
    act(() => {
      screen.getByRole("button", { name: copy.cancel }).click();
    });
    const trigger = screen.getByRole("button", { name: deckVersioningCopy.pending.discardCta });
    expect(document.activeElement).toBe(trigger);
    expect(discardDeckDraft).not.toHaveBeenCalled();
  });

  it("announces the discard and says which version the deck is back on", async () => {
    vi.mocked(discardDeckDraft).mockResolvedValue({ ok: true });
    const onDiscarded = vi.fn();
    discard({ onDiscarded });
    act(raise);
    await act(async () => {
      screen.getByRole("button", { name: copy.confirm(36) }).click();
    });
    // The version the confirmation named, sent with the call so the server can
    // refuse a discard that would land somewhere else.
    expect(discardDeckDraft).toHaveBeenCalledWith("d", "v");
    expect(screen.getByRole("status").textContent).toBe(copy.announced(36, 2));
    expect(onDiscarded).toHaveBeenCalled();
  });

  // `disabled={pending}` lands a render later, so two clicks in one tick both
  // reach the handler. The second carries the same expected version, which means
  // a commit landing between the two would satisfy the server's guard for a
  // discard nobody asked for.
  it("sends one discard however fast the button is pressed twice", async () => {
    vi.mocked(discardDeckDraft).mockResolvedValue({ ok: true });
    discard({ onDiscarded: vi.fn() });
    act(raise);
    const go = screen.getByRole("button", { name: copy.confirm(36) });
    await act(async () => {
      go.click();
      go.click();
    });
    expect(discardDeckDraft).toHaveBeenCalledTimes(1);
  });

  // A host that navigates takes this surface and the deck name beside it with
  // it, so only a host staying put gets the handoff below.
  it("hands focus to the deck name when the host stays put", async () => {
    vi.mocked(discardDeckDraft).mockResolvedValue({ ok: true });
    const name = deckName();
    discard({ onDiscarded: undefined });
    act(raise);
    await act(async () => {
      screen.getByRole("button", { name: copy.confirm(36) }).click();
    });
    // Every draft control is about to be removed by the revalidation, so focus
    // goes to the one thing certain to still be in the document.
    expect(document.activeElement).toBe(name);
  });

  it("says nothing changed when the write is refused", async () => {
    vi.mocked(discardDeckDraft).mockResolvedValue({ ok: false, message: "no version" });
    discard();
    act(raise);
    await act(async () => {
      screen.getByRole("button", { name: copy.confirm(36) }).click();
    });
    // The server's own message is dropped: every way this write fails leaves the
    // draft intact, and that is the thing to say.
    expect(screen.getByRole("alert").textContent).toBe(copy.refused);
    expect(screen.queryByText("no version")).toBeNull();
    // The question stays up, because the draft is still there to discard or keep.
    expect(screen.getByRole("button", { name: copy.confirm(36) })).toBeTruthy();
  });

  // A thrown action is a different class from a refusal, and it says a different
  // thing: the restore may have committed and the reply been what was lost, so
  // this is the one path that cannot promise the draft survived.
  it("admits the outcome is unknown when the action throws, and re-reads", async () => {
    vi.mocked(discardDeckDraft).mockRejectedValue(new Error("offline"));
    discard();
    act(raise);
    await act(async () => {
      screen.getByRole("button", { name: copy.confirm(36) }).click();
    });
    expect(screen.getByRole("alert").textContent).toBe(copy.unresolved);
    // Never the sentence that promises nothing changed.
    expect(screen.queryByText(copy.refused)).toBeNull();
    // Nothing is announced: a discard nobody can confirm has no receipt.
    expect(screen.getByRole("status").textContent).toBe("");
    // The refresh is what settles it, and what drops the question once the
    // re-read comes back with no changes left.
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  // The latch used to open in a `finally`, which runs on the throw as well: a
  // second press then sent a second discard carrying the same expected version,
  // against a draft that may already be gone. It matters most for the pending
  // banner, which passes no `onWriteState` — there this ref is the only thing
  // between the reader and that second destructive write. It opens when the
  // question is dismissed, which unmounts the component.
  it("sends no second discard once the outcome is unknown", async () => {
    vi.mocked(discardDeckDraft).mockRejectedValue(new Error("offline"));
    discard();
    act(raise);
    const go = screen.getByRole("button", { name: copy.confirm(36) });
    await act(async () => {
      go.click();
    });
    expect(screen.getByRole("alert").textContent).toBe(copy.unresolved);
    await act(async () => {
      go.click();
    });
    expect(discardDeckDraft).toHaveBeenCalledTimes(1);
  });

  // The latch is held through an unknown outcome, and the answer has to say so.
  // `PendingBanner` — this suite's own host shape — passes no `disabled` and no
  // `onWriteState`, so a button left enabled over that latch is a control that
  // eats every press with nothing on screen to explain it. The re-read is what
  // gives the answer back.
  it("withholds the destructive answer while the outcome is unknown, and restores it on the re-read", async () => {
    vi.mocked(discardDeckDraft).mockRejectedValue(new Error("offline"));
    const view = discard();
    act(raise);
    await act(async () => {
      screen.getByRole("button", { name: copy.confirm(36) }).click();
    });
    expect(screen.getByRole("alert").textContent).toBe(copy.unresolved);
    expect(screen.getByRole("button", { name: copy.confirm(36) })).toBeDisabled();

    // The refresh landing: a state the server built after the fact.
    vi.mocked(discardDeckDraft).mockResolvedValue({ ok: true });
    await act(async () => {
      view.rerender(<Host onDiscarded={vi.fn()} state={{ ...STATE_36 }} />);
    });
    const retry = screen.getByRole("button", { name: copy.confirm(36) });
    expect(retry).toBeEnabled();
    await act(async () => {
      retry.click();
    });
    expect(discardDeckDraft).toHaveBeenCalledTimes(2);
  });

  // The host is told, in the same tick as the click, so a write it owns cannot
  // start against this one. `settled` is reported on a REFUSAL — the server
  // declined before it wrote — and never after a throw.
  it("reports its own write to the host, and never settles an unknown one", async () => {
    const onWriteState = vi.fn();
    vi.mocked(discardDeckDraft).mockRejectedValue(new Error("offline"));
    discard({ onWriteState });
    act(raise);
    await act(async () => {
      screen.getByRole("button", { name: copy.confirm(36) }).click();
    });
    expect(onWriteState.mock.calls.map(([s]) => s)).toEqual(["writing", "unknown"]);
  });

  it("draws no control on a brew — there is no version to go back to", () => {
    discard({ state: { ...STATE_36, version: null } });
    expect(
      screen.queryByRole("button", { name: deckVersioningCopy.pending.discardCta }),
    ).toBeNull();
  });
});

// The basics stepper's pending count is settled before the restore (round 4 of #1752): sent after it, the
// stepper's absolute figure would dirty the draft the player had just discarded.
describe("discard and the basics stepper", () => {
  it("flushes the stepper's queue before restoring", async () => {
    const { BasicCountsProvider } = await import("./basic-counts");
    const order: string[] = [];
    const counts = {
      flush: vi.fn(async () => { order.push("flush"); return true; }),
      set: vi.fn(), takeOver: vi.fn(() => false), base: vi.fn(() => null), subscribe: vi.fn(() => () => {}), configure: vi.fn(),
    };
    vi.mocked(discardDeckDraft).mockImplementation(async () => { order.push("discard"); return { ok: true }; });
    render(<BasicCountsProvider value={counts}><Host onDiscarded={vi.fn()} /></BasicCountsProvider>);
    act(raise);
    await act(async () => {
      screen.getByRole("button", { name: copy.confirm(36) }).click();
    });
    expect(order).toEqual(["flush", "discard"]);
  });
});
