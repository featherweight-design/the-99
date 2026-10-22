import { describe, expect, it } from "vitest";
import { handOffFrom, resultsHref } from "./hand-off";
import { handOffHref } from "../../components/intake/choose-row";
import { emptyParams, parseChooseParams } from "./params";

const COMMANDER = "0000aaaa-0000-4000-8000-00000000000c";
const CARD = "0000aaaa-0000-4000-8000-000000000001";

describe("the hand-off's params", () => {
  it("reads a result's press as the results screen it came from, and goes back to exactly that", () => {
    const p = { ...emptyParams(), results: true, words: "big lizards", colors: ["r", "g"], themes: ["dinosaurs"], card: CARD, budgetDollars: 150, bracket: 2 as const };
    const press = new URL(handOffHref(COMMANDER, p), "http://x");
    expect(press.searchParams.get("commander")).toBe(COMMANDER);
    const asked = handOffFrom(press.searchParams)!;
    expect(asked).toEqual(parseChooseParams(new URLSearchParams(new URL(resultsHref(asked), "http://x").search)));
    expect(asked).toMatchObject({ words: "big lizards", colors: ["r", "g"], themes: ["dinosaurs"], card: CARD, budgetDollars: 150, bracket: 2 });
    expect(new URL(resultsHref(asked), "http://x").pathname).toBe("/decks/new/choose");
  });

  it("is no hand-off without the results marker: a picker press or a commander page's link draws today's page", () => {
    expect(handOffFrom(new URLSearchParams({ commander: COMMANDER }))).toBeNull();
    expect(handOffFrom(new URLSearchParams({ commander: COMMANDER, b: "150", t: "dinosaurs" }))).toBeNull();
  });
});
