import { act, render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { synergyCopy } from "../../lib/copy/synergy-discovery";
import { recommendationsCopy } from "../../lib/copy/recommendations";

const actions = vi.hoisted(() => ({
  fillOwned: vi.fn(), fillUnowned: vi.fn(),
}));
vi.mock("../../app/decks/actions", () => ({
  fillLastSlotsOwned: actions.fillOwned,
  fillLastSlotsUnowned: actions.fillUnowned,
}));

import { LastSlotsStrip } from "./last-slots-strip";

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

const base = {
  deckId: "deck-1", openSlots: 31, ownedCandidates: 12, unownedCandidates: 40,
  commanderShortName: "Atraxa", onAnnounce: () => {},
};

beforeEach(() => {
  actions.fillOwned.mockReset().mockResolvedValue({ ok: true, added: 12, total: 80, shortfall: 19 });
  actions.fillUnowned.mockReset().mockResolvedValue({ ok: true, added: 19, total: 99, bought: 19 });
});

describe("LastSlotsStrip", () => {
  // State 2: shallow pool. Rule 4 — A never promises 99.
  it("states what the owned pool can place, not the gap", () => {
    render(<LastSlotsStrip {...base} />);
    expect(screen.getByRole("button", { name: synergyCopy.lastSlots.fillOwnedAria("12") })).toBeInTheDocument();
    expect(screen.queryByText(/Fill 31/)).not.toBeInTheDocument();
  });

  it("explains the number with the owned note", () => {
    render(<LastSlotsStrip {...base} />);
    expect(screen.getByText(synergyCopy.lastSlots.ownedNote("12", "Atraxa"))).toBeInTheDocument();
  });

  // State 9. Rule 3 — the strip unmounts as a unit, heading and all.
  it("renders nothing at all when there are no open slots", () => {
    const { container } = render(<LastSlotsStrip {...base} openSlots={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  // State 6. Rule 1 — absent, not disabled.
  it("omits the owned control when there are no owned candidates", () => {
    render(<LastSlotsStrip {...base} ownedCandidates={0} />);
    expect(screen.queryByRole("button", { name: /from my collection/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: synergyCopy.lastSlots.topUpAria("31") })).toBeEnabled();
  });

  // State 12.
  it("omits the top-up when there are no unowned candidates", () => {
    render(<LastSlotsStrip {...base} unownedCandidates={0} />);
    expect(screen.queryByRole("button", { name: /Top up/ })).not.toBeInTheDocument();
  });

  // States 3 and 8. Rule 2 — nothing unmounts mid-action.
  it("disables the other control during a write rather than unmounting it", async () => {
    const pending = deferred<{ ok: true; added: number; total: number; shortfall: number }>();
    actions.fillOwned.mockReturnValue(pending.promise);
    render(<LastSlotsStrip {...base} />);
    await act(async () => {
      screen.getByRole("button", { name: synergyCopy.lastSlots.fillOwnedAria("12") }).click();
    });
    const topUp = screen.getByRole("button", { name: synergyCopy.lastSlots.topUpAria("31") });
    expect(topUp).toBeInTheDocument();
    expect(topUp).toBeDisabled();
    expect(screen.getByText(recommendationsCopy.fill.fillingRows("12"))).toBeInTheDocument();
    pending.resolve({ ok: true, added: 12, total: 80, shortfall: 19 });
  });

  // State 5, §7.6. The shortfall is honest, not alarming: --accent, not --warning.
  it("draws the shortfall line in the provenance shape, not the warning one", async () => {
    render(<LastSlotsStrip {...base} />);
    await act(async () => {
      screen.getByRole("button", { name: synergyCopy.lastSlots.fillOwnedAria("12") }).click();
    });
    const line = await screen.findByText(synergyCopy.lastSlots.short("80", "19"));
    // Asserted as longhands rather than the `border-left` shorthand: jsdom
    // refuses to expand a shorthand whose value carries a var() reference, so
    // the shorthand form reads as empty no matter what the element carries.
    expect(line.closest("[data-testid='last-slots-shortfall']")).toHaveStyle({
      borderLeftWidth: "3px",
      borderLeftStyle: "solid",
      borderLeftColor: "var(--accent)",
    });
  });

  // §7.6 ordering — the brief requires B to sit directly beneath the shortfall
  // line, meaning the shortfall line must precede control B in document order.
  it("places the shortfall line before control B in document order", async () => {
    render(<LastSlotsStrip {...base} />);
    await act(async () => {
      screen.getByRole("button", { name: synergyCopy.lastSlots.fillOwnedAria("12") }).click();
    });
    const shortfall = await screen.findByTestId("last-slots-shortfall");
    const topUp = screen.getByRole("button", { name: synergyCopy.lastSlots.topUpAria("31") });
    // Node.DOCUMENT_POSITION_FOLLOWING (4) means shortfall precedes topUp.
    expect(shortfall.compareDocumentPosition(topUp) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  // State 10. Rule 5 — the refusal is under the clicked control and the other
  // control is untouched.
  it("leaves the other control enabled after a refusal", async () => {
    actions.fillOwned.mockResolvedValue({ ok: false, message: synergyCopy.lastSlots.fillFailed });
    render(<LastSlotsStrip {...base} />);
    await act(async () => {
      screen.getByRole("button", { name: synergyCopy.lastSlots.fillOwnedAria("12") }).click();
    });
    expect(await screen.findByText(synergyCopy.lastSlots.fillFailed)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: synergyCopy.lastSlots.topUpAria("31") })).toBeEnabled();
  });

  // Rule 7, and the announcement rule: one message per settle, not per row.
  it("announces the settle once", async () => {
    const onAnnounce = vi.fn();
    render(<LastSlotsStrip {...base} onAnnounce={onAnnounce} />);
    await act(async () => {
      screen.getByRole("button", { name: synergyCopy.lastSlots.fillOwnedAria("12") }).click();
    });
    await screen.findByText(synergyCopy.lastSlots.short("80", "19"));
    expect(onAnnounce).toHaveBeenCalledExactlyOnceWith(
      synergyCopy.lastSlots.shortAnnounce("12", "80", "19"),
    );
  });

  // Finding 8 — the filled-at-99 path is a separate branch from the shortfall
  // path and must be covered independently. Deleting the filledAnnounce branch
  // leaves the shortfall tests green because they never exercise shortfall === 0.
  it("announces the fill and shows no shortfall line when A fills the deck", async () => {
    const onAnnounce = vi.fn();
    actions.fillOwned.mockResolvedValue({ ok: true, added: 31, total: 99, shortfall: 0 });
    render(<LastSlotsStrip {...base} onAnnounce={onAnnounce} />);
    await act(async () => {
      screen.getByRole("button", { name: synergyCopy.lastSlots.fillOwnedAria("12") }).click();
    });
    expect(onAnnounce).toHaveBeenCalledExactlyOnceWith(
      synergyCopy.lastSlots.filledAnnounce("31", "99"),
    );
    expect(screen.queryByTestId("last-slots-shortfall")).not.toBeInTheDocument();
  });

  // The shortfall line is a receipt for one run. A second A run — the player
  // acquires cards, the page refreshes the pool, they press Fill again — can
  // reach 99, and the earlier "still 19 short" must not survive under a deck
  // that is no longer short.
  it("clears a prior shortfall line once a later A run fills the deck", async () => {
    render(<LastSlotsStrip {...base} />);
    await act(async () => {
      screen.getByRole("button", { name: synergyCopy.lastSlots.fillOwnedAria("12") }).click();
    });
    expect(await screen.findByTestId("last-slots-shortfall")).toBeInTheDocument();

    actions.fillOwned.mockResolvedValue({ ok: true, added: 19, total: 99, shortfall: 0 });
    await act(async () => {
      screen.getByRole("button", { name: synergyCopy.lastSlots.fillOwnedAria("12") }).click();
    });
    expect(screen.queryByTestId("last-slots-shortfall")).not.toBeInTheDocument();
  });

  // Finding 5 — rule 4's clamp. The fixture uses ownedCandidates < openSlots
  // so the min never fires there. This case inverts it: ownedCandidates > openSlots
  // and the label must carry openSlots, not ownedCandidates.
  it("clamps A's label to openSlots when the pool exceeds the gap", () => {
    render(<LastSlotsStrip {...base} openSlots={5} ownedCandidates={12} />);
    expect(screen.getByRole("button", { name: synergyCopy.lastSlots.fillOwnedAria("5") })).toBeInTheDocument();
    expect(screen.queryByText(/Fill 12/)).not.toBeInTheDocument();
  });

  // Finding 3 — control B's full path. Clicking B calls fillLastSlotsUnowned,
  // its success announces boughtAnnounce exactly once, its refusal renders
  // MutationError under B while leaving A enabled, and its in-flight state
  // disables A while showing B's fillingRows label.

  it("calls fillLastSlotsUnowned and announces the settle when B is clicked", async () => {
    const onAnnounce = vi.fn();
    render(<LastSlotsStrip {...base} onAnnounce={onAnnounce} />);
    await act(async () => {
      screen.getByRole("button", { name: synergyCopy.lastSlots.topUpAria("31") }).click();
    });
    expect(actions.fillUnowned).toHaveBeenCalledWith("deck-1");
    expect(onAnnounce).toHaveBeenCalledExactlyOnceWith(
      synergyCopy.lastSlots.boughtAnnounce("19", "99", "19"),
    );
  });

  it("renders MutationError under B and leaves A enabled after B is refused", async () => {
    actions.fillUnowned.mockResolvedValue({ ok: false, message: synergyCopy.lastSlots.topUpFailed });
    render(<LastSlotsStrip {...base} />);
    await act(async () => {
      screen.getByRole("button", { name: synergyCopy.lastSlots.topUpAria("31") }).click();
    });
    expect(await screen.findByText(synergyCopy.lastSlots.topUpFailed)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: synergyCopy.lastSlots.fillOwnedAria("12") })).toBeEnabled();
  });

  // The actions catch their own failures, but the call itself can reject before
  // any of that runs. Without the finally the strip would sit disabled with
  // nothing said and no way back but a reload — the one failure that costs the
  // player the whole surface rather than one control.
  it.each([
    {
      name: "A",
      mock: () => actions.fillOwned,
      aria: synergyCopy.lastSlots.fillOwnedAria("12"),
      other: synergyCopy.lastSlots.topUpAria("31"),
      message: synergyCopy.lastSlots.fillFailed,
    },
    {
      name: "B",
      mock: () => actions.fillUnowned,
      aria: synergyCopy.lastSlots.topUpAria("31"),
      other: synergyCopy.lastSlots.fillOwnedAria("12"),
      message: synergyCopy.lastSlots.topUpFailed,
    },
  ])("recovers both controls when $name's call rejects outright", async ({ mock, aria, other, message }) => {
    mock().mockRejectedValue(new Error("network"));
    render(<LastSlotsStrip {...base} />);
    await act(async () => {
      screen.getByRole("button", { name: aria }).click();
    });
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: aria })).toBeEnabled();
    expect(screen.getByRole("button", { name: other })).toBeEnabled();
  });

  // B is the way forward from a shortfall, so once B settles the numbers A left
  // behind are stale. Without this the setSettled(null) in runUnowned could be
  // deleted with every other test still green.
  it("clears A's shortfall line once B settles", async () => {
    render(<LastSlotsStrip {...base} />);
    await act(async () => {
      screen.getByRole("button", { name: synergyCopy.lastSlots.fillOwnedAria("12") }).click();
    });
    expect(await screen.findByTestId("last-slots-shortfall")).toBeInTheDocument();
    await act(async () => {
      screen.getByRole("button", { name: synergyCopy.lastSlots.topUpAria("31") }).click();
    });
    expect(screen.queryByTestId("last-slots-shortfall")).not.toBeInTheDocument();
  });

  it("disables A and shows B's fillingRows label while B's write is in flight", async () => {
    const pending = deferred<{ ok: true; added: number; total: number; bought: number }>();
    actions.fillUnowned.mockReturnValue(pending.promise);
    render(<LastSlotsStrip {...base} />);
    await act(async () => {
      screen.getByRole("button", { name: synergyCopy.lastSlots.topUpAria("31") }).click();
    });
    const ownedBtn = screen.getByRole("button", { name: synergyCopy.lastSlots.fillOwnedAria("12") });
    expect(ownedBtn).toBeDisabled();
    // In-flight label uses openSlots (31), not unownedCandidates (40) — B places
    // every open slot, owned and unowned alike, so the count must match the aria-label.
    expect(screen.getByText(recommendationsCopy.fill.fillingRows("31"))).toBeInTheDocument();
    pending.resolve({ ok: true, added: 19, total: 99, bought: 19 });
  });

  // M4 — the badge on B's face must match the aria-label (both should be openSlots).
  it("shows openSlots on B's badge face, matching the aria-label count", () => {
    render(<LastSlotsStrip {...base} openSlots={7} unownedCandidates={40} />);
    // aria-label uses openSlots; the visible badge must also use openSlots.
    const btn = screen.getByRole("button", { name: synergyCopy.lastSlots.topUpAria("7") });
    // The badge text "7" appears inside the button.
    expect(btn).toHaveTextContent("7");
    // The unowned-candidate count (40) must not appear on the button face.
    expect(btn.textContent).not.toMatch(/40/);
  });

  it("calls onCompletedByFill when A returns total 99", async () => {
    const onCompletedByFill = vi.fn();
    actions.fillOwned.mockResolvedValueOnce({ ok: true, added: 31, total: 99, shortfall: 0 });
    render(<LastSlotsStrip {...base} onCompletedByFill={onCompletedByFill} />);
    await act(async () => {
      screen.getByRole("button", { name: synergyCopy.lastSlots.fillOwnedAria("12") }).click();
    });
    expect(onCompletedByFill).toHaveBeenCalledOnce();
  });

  it("does not call onCompletedByFill when A returns total 80", async () => {
    const onCompletedByFill = vi.fn();
    actions.fillOwned.mockResolvedValueOnce({ ok: true, added: 12, total: 80, shortfall: 19 });
    render(<LastSlotsStrip {...base} onCompletedByFill={onCompletedByFill} />);
    await act(async () => {
      screen.getByRole("button", { name: synergyCopy.lastSlots.fillOwnedAria("12") }).click();
    });
    expect(onCompletedByFill).not.toHaveBeenCalled();
  });

  it("calls onCompletedByFill when B returns total 99", async () => {
    const onCompletedByFill = vi.fn();
    actions.fillUnowned.mockResolvedValueOnce({ ok: true, added: 19, total: 99, bought: 19 });
    render(<LastSlotsStrip {...base} onCompletedByFill={onCompletedByFill} />);
    await act(async () => {
      screen.getByRole("button", { name: synergyCopy.lastSlots.topUpAria("31") }).click();
    });
    expect(onCompletedByFill).toHaveBeenCalledOnce();
  });

  // Design table state 3 / state 8: onInflight signals the shell so it can
  // disable control C while either fill is in flight.
  it("calls onInflight(true) when A starts and onInflight(false) when A settles", async () => {
    const pending = deferred<{ ok: true; added: number; total: number; shortfall: number }>();
    actions.fillOwned.mockReturnValue(pending.promise);
    const onInflight = vi.fn();
    render(<LastSlotsStrip {...base} onInflight={onInflight} />);
    await act(async () => {
      screen.getByRole("button", { name: synergyCopy.lastSlots.fillOwnedAria("12") }).click();
    });
    expect(onInflight).toHaveBeenLastCalledWith(true);
    await act(async () => {
      pending.resolve({ ok: true, added: 12, total: 80, shortfall: 19 });
    });
    expect(onInflight).toHaveBeenLastCalledWith(false);
    expect(onInflight).toHaveBeenCalledTimes(2);
  });

  it("calls onInflight(true) when B starts and onInflight(false) when B settles", async () => {
    const pending = deferred<{ ok: true; added: number; total: number; bought: number }>();
    actions.fillUnowned.mockReturnValue(pending.promise);
    const onInflight = vi.fn();
    render(<LastSlotsStrip {...base} onInflight={onInflight} />);
    await act(async () => {
      screen.getByRole("button", { name: synergyCopy.lastSlots.topUpAria("31") }).click();
    });
    expect(onInflight).toHaveBeenLastCalledWith(true);
    await act(async () => {
      pending.resolve({ ok: true, added: 19, total: 99, bought: 19 });
    });
    expect(onInflight).toHaveBeenLastCalledWith(false);
    expect(onInflight).toHaveBeenCalledTimes(2);
  });
});
