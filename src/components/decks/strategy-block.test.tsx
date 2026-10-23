import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { StrategyRead } from "@/lib/strategy/load";
import type { StrategyAxis, StrategyKey } from "@/lib/strategy/score";
import { StrategyBlock } from "./strategy-block";

const axis = (key: StrategyAxis["key"], copies: number): StrategyAxis => ({ key, family: "theme", copies, score: copies });
const ok = (over: Partial<StrategyRead> = {}): StrategyRead => ({
  strategy: { state: "ok", axes: [axis("typal:Ally", 22), axis("spellslinger", 14), axis("tokens", 11)] },
  focus: null,
  pending: null,
  ...over,
});

function draw(read: StrategyRead, focus: StrategyKey | null = null) {
  const onPick = vi.fn();
  const view = render(<StrategyBlock read={read} focus={focus} refused={false} onPick={onPick} />);
  return { ...view, onPick, group: () => screen.getByRole("radiogroup") };
}

describe("StrategyBlock", () => {
  it("lists each strategy with its count and an empty radio, and says no focus yet", () => {
    const { group } = draw(ok());
    const rows = within(group()).getAllByRole("radio");
    expect(rows.map((r) => r.textContent)).toEqual(["Allies22 cards", "Spells matter14 cards", "Tokens11 cards"]);
    expect(rows.every((r) => r.getAttribute("aria-checked") === "false")).toBe(true);
    expect(screen.getByText(/No focus yet/)).toBeTruthy();
    expect(document.querySelectorAll('[data-centre="empty"]').length).toBeGreaterThan(0);
  });

  it("picks a focus by its legend row, and Keep it balanced clears it", () => {
    const { group, onPick } = draw(ok(), "tokens");
    expect(within(group()).getByRole("radio", { name: /Tokens/ }).getAttribute("aria-checked")).toBe("true");
    expect(document.querySelectorAll('[data-centre="medallion"]').length).toBeGreaterThan(0);
    fireEvent.click(within(group()).getByRole("radio", { name: /Allies/ }));
    expect(onPick).toHaveBeenLastCalledWith("typal:Ally");
    fireEvent.click(screen.getByRole("button", { name: "Keep it balanced" }));
    expect(onPick).toHaveBeenLastCalledWith(null);
  });

  it("counts pending changes since the last commit, and grows the focus arc", () => {
    const { group } = draw(ok({ pending: { tokens: { added: 2, removed: 0 }, spellslinger: { added: 0, removed: 1 } } }), "tokens");
    // The live 11 Tokens include the 2 added: the legend reads the committed 9, then +2.
    expect(within(group()).getByRole("radio", { name: /Tokens/ }).textContent).toBe("Tokens9 +2 cards");
    expect(within(group()).getByRole("radio", { name: /Spells/ }).textContent).toBe("Spells matter15 −1 cards");
    expect(document.querySelectorAll('[data-arc="growth"]').length).toBeGreaterThan(0);
  });

  it("keeps a focus outside the top five as a sixth, marked row", () => {
    const read = ok({ focus: { key: "mill", axis: axis("mill", 4), inTop: false } });
    const { group } = draw(read, "mill");
    const sixth = within(group()).getAllByRole("radio").at(-1)!;
    expect(sixth.textContent).toBe("Millyour focus4 cards");
    expect(sixth.getAttribute("aria-checked")).toBe("true");
  });

  it("draws one box, and no pick, when the deck is too small", () => {
    draw({ strategy: { state: "tooSmall", nonland: 18 }, focus: null, pending: null });
    expect(screen.getByText(/This one has 18\./)).toBeTruthy();
    expect(document.querySelector('[data-strategy-empty="tooSmall"]')).toBeTruthy();
    expect(screen.queryByRole("radiogroup")).toBeNull();
  });

  it("draws one box, and no pick, when nothing stands out", () => {
    draw({ strategy: { state: "none" }, focus: null, pending: null });
    expect(screen.getByText("No strategy stands out yet.")).toBeTruthy();
    expect(document.querySelector('[data-strategy-empty="none"]')).toBeTruthy();
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(screen.queryByText(/No focus yet/)).toBeNull();
  });

  it("names the count's noun by the figure drawn first", () => {
    const { group } = draw(ok({ strategy: { state: "ok", axes: [axis("tokens", 1)] }, pending: { tokens: { added: 0, removed: 1 } } }));
    expect(within(group()).getByRole("radio").textContent).toBe("Tokens2 −1 cards");
  });
});
