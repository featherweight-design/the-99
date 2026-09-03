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
  commanderShortName: "Atraxa", onAnnounce: () => {}, width: "desktop" as const,
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
    expect(line.closest("[data-testid='last-slots-shortfall']")).toHaveStyle({
      borderLeft: "3px solid var(--accent)",
    });
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
});
