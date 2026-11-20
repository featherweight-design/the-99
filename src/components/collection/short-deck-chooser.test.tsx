// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ShortChoice } from "../../lib/collection/write";
import { ShortDeckChooser, choosable, defaultMarks, keeperOf } from "./short-deck-chooser";

afterEach(cleanup);

const claimant = (deckId: string, allocated: number, since: number, extra: Partial<ShortChoice["claimants"][number]> = {}) =>
  ({ deckId, deckName: `Deck ${deckId}`, quantity: 1, since, allocated, commander: false, ...extra });
const two: ShortChoice = { oracleId: "o1", cardName: "Counterspell", claimants: [claimant("a", 1, 1_000), claimant("b", 0, 2_000)] };
const three: ShortChoice = { oracleId: "o1", cardName: "Counterspell", claimants: [claimant("a", 1, 1_000), claimant("b", 0, 2_000), claimant("c", 0, 3_000)] };

describe("the chooser's pure rules", () => {
  it("draws only when every claimant asks for one copy and none holds it as a commander", () => {
    expect(choosable(two)).toBe(true);
    expect(choosable(undefined)).toBe(false);
    expect(choosable({ ...two, claimants: [claimant("a", 1, 1, { quantity: 2 }), claimant("b", 0, 2)] })).toBe(false);
    expect(choosable({ ...two, claimants: [claimant("a", 1, 1, { commander: true }), claimant("b", 0, 2)] })).toBe(false);
    expect(choosable({ ...two, claimants: [claimant("a", 1, 1)] })).toBe(false);
  });

  it("marks the decks the allocation leaves without a copy, and names the one keeper once the count is met", () => {
    expect([...defaultMarks(three)]).toEqual(["b", "c"]);
    expect(keeperOf(three, new Set(["b", "c"]))?.deckId).toBe("a");
    expect(keeperOf(three, new Set(["b"]))).toBeNull();
  });
});

describe("ShortDeckChooser", () => {
  const draw = (choice: ShortChoice, onConfirm = vi.fn()) => {
    render(<ShortDeckChooser titleId="t" cardName="Counterspell" choice={choice} pending={false} onCancel={() => undefined} onConfirm={onConfirm} />);
    return onConfirm;
  };

  it("opens on the server's default, confirms it without a keeper pick", () => {
    const onConfirm = draw(two);
    expect(screen.getByRole("radio", { name: /Deck b/ }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radio", { name: /Deck a/ }).getAttribute("aria-checked")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: "Remove anyway" }));
    expect(onConfirm).toHaveBeenCalledWith([expect.objectContaining({ deckId: "b", oracleId: "o1", short: 1 })], null);
  });

  it("a pick moves the mark, sends the other deck as the keeper, and Back to first committed undoes it", () => {
    const onConfirm = draw(two);
    fireEvent.click(screen.getByRole("radio", { name: /Deck a/ }));
    expect(screen.getByRole("radio", { name: /Deck a/ }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("button", { name: "Back to first committed" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Remove anyway" }));
    expect(onConfirm).toHaveBeenCalledWith([expect.objectContaining({ deckId: "a" })], { oracleId: "o1", deckId: "b" });
    fireEvent.click(screen.getByRole("button", { name: "Back to first committed" }));
    expect(screen.getByRole("radio", { name: /Deck b/ }).getAttribute("aria-checked")).toBe("true");
  });

  it("with three decks it is checkboxes with a tally; a full tap is an inline reason; unticking turns the confirm off", () => {
    draw(three);
    expect(screen.getByText("2 of 2 picked")).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: /Deck a/ }));
    expect(screen.getByText("2 decks are already going short. Untick one first.")).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: /Deck c/ }));
    expect(screen.getByText("1 of 2 picked")).toBeTruthy();
    expect(screen.getByText("Pick 1 more to go short.")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Remove anyway" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
