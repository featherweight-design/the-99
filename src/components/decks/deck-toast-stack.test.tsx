// @vitest-environment jsdom
// Small items 3, item 8 (`Deck-Toasts`): every deck toast stands on one floor above the bar at the page's foot, in one
// stack, the receipt on the floor and the one alert above it.
import { cleanup, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastFrame } from "../collection/edit-toast";
import { DECK_FOOT_VAR, DECK_STACK_CLASS, DeckToastStackHost, deckToastStack, footClearance, useDeckFootClearance } from "./deck-toast-stack";
import { DeckRefusalToast, TokenRefusalToast } from "./token-refusal-toast";
import { QuickAddFailedToast } from "./quick-add-failed-toast";

afterEach(() => {
  cleanup();
  document.querySelectorAll("[data-deck-toast-stack]").forEach((el) => el.remove());
  document.documentElement.style.removeProperty(DECK_FOOT_VAR);
});

function Receipt() {
  const ref = { current: null };
  return <ToastFrame frameRef={ref} placement="deck" kind="receipt" title="Sol Ring added · ×1" detail="C21 #263 · Nonfoil" />;
}

const stackOf = (el: HTMLElement) => el.closest<HTMLElement>("[data-deck-toast-stack]");

describe("the stack's floor", () => {
  it("is 10px above the bar at the foot on a phone (over the tab bar), and the higher of 16px and that from md", () => {
    // With no bar, `--deck-foot-h` is unset and falls back to 0: the shipped slot (tab bar + 10; 16 from md).
    expect(DECK_STACK_CLASS).toContain("bottom-[calc(var(--tabbar-h,0px)+var(--deck-foot-h,0px)+10px)]");
    expect(DECK_STACK_CLASS).toContain("md:bottom-[max(16px,var(--deck-foot-h,0px)+10px)]");
    // Phone gutters, and the shipped desktop left edge and width.
    expect(DECK_STACK_CLASS).toContain("left-[16px] right-[16px]");
    expect(DECK_STACK_CLASS).toContain("md:left-[calc(var(--rail-w)+16px)] md:right-auto md:w-[440px]");
    expect(DECK_STACK_CLASS).toContain("flex flex-col gap-[10px]");
  });

  it("uses the shell's host when there is one, and makes one on the body when there is not", () => {
    const made = deckToastStack();
    expect(made.parentElement).toBe(document.body);
    expect(deckToastStack()).toBe(made);
    made.remove();
    render(<div data-testid="shell"><DeckToastStackHost /></div>);
    expect(deckToastStack().parentElement).toBe(screen.getByTestId("shell"));
  });
});

describe("each deck toast kind stands in the stack, never lifted", () => {
  it.each([
    ["a receipt", <Receipt key="r" />, "order-2"],
    ["a removal's refusal", <DeckRefusalToast key="d" title="We couldn’t remove that." detail="Badgermole" onDone={() => {}} />, "order-1"],
    ["a token's refusal", <TokenRefusalToast key="t" name="Spirit" onDone={() => {}} />, "order-1"],
    ["the failed search", <QuickAddFailedToast key="q" insideProps={{}} onRetry={() => {}} onDone={() => {}} />, "order-1"],
  ])("%s", (_, node, order) => {
    const { container } = render(node);
    const frame = document.querySelector<HTMLElement>("[data-toast=deck]")!;
    expect(container.contains(frame)).toBe(false);
    expect(stackOf(frame)).not.toBeNull();
    expect(frame.className).toContain(order);
    expect(frame.className).toContain("pointer-events-auto");
    // No fixed slot of its own and no lift: the stack places it.
    expect(frame.className).not.toContain("fixed");
    expect(frame.style.translate).toBe("");
  });
});

describe("two toasts at once", () => {
  it("a receipt keeps the floor and the alert sits above it, in one stack, whichever mounted first", () => {
    render(<><DeckRefusalToast title="We couldn’t remove that." detail="Badgermole" onDone={() => {}} /><Receipt /></>);
    const alert = screen.getByRole("alert");
    const receipt = screen.getByRole("status");
    expect(stackOf(alert)).toBe(stackOf(receipt));
    // A flex column: `order-1` draws above `order-2`, the floor.
    expect(alert.className).toContain("order-1");
    expect(receipt.className).toContain("order-2");
  });

  it("a receipt arriving dismisses a refusal but leaves the failed search, which stays above it", () => {
    const refusalDone = vi.fn();
    render(<TokenRefusalToast name="Spirit" onDone={refusalDone} />);
    render(<ReceiptClaiming />);
    expect(refusalDone).toHaveBeenCalledTimes(1);
    cleanup();
    const failedDone = vi.fn();
    render(<QuickAddFailedToast insideProps={{}} onRetry={() => {}} onDone={failedDone} />);
    render(<ReceiptClaiming />);
    expect(failedDone).not.toHaveBeenCalled();
    const alert = screen.getByRole("alert");
    expect(stackOf(alert)).toBe(stackOf(screen.getByRole("status")));
    expect(alert.className).toContain("order-1");
  });

  it("one alert at a time: the newer replaces the older, whichever kind it is", () => {
    const failedDone = vi.fn();
    const refusalDone = vi.fn();
    render(<QuickAddFailedToast insideProps={{}} onRetry={() => {}} onDone={failedDone} />);
    render(<DeckRefusalToast title="We couldn’t remove that." detail="Badgermole" onDone={refusalDone} />);
    expect(failedDone).toHaveBeenCalledTimes(1);
    expect(refusalDone).not.toHaveBeenCalled();
    cleanup();
    const failedDone2 = vi.fn();
    const refusalDone2 = vi.fn();
    render(<DeckRefusalToast title="We couldn’t remove that." detail="Badgermole" onDone={refusalDone2} />);
    render(<QuickAddFailedToast insideProps={{}} onRetry={() => {}} onDone={failedDone2} />);
    expect(refusalDone2).toHaveBeenCalledTimes(1);
    expect(failedDone2).not.toHaveBeenCalled();
  });
});

// The receipt's claim, as `GotItReceipt` dispatches it on entering the stack.
function ReceiptClaiming() {
  const [claimed] = useState(() => {
    window.dispatchEvent(new Event("the99:deck-toast-claim"));
    return true;
  });
  return claimed ? <Receipt /> : null;
}

describe("the foot clearance a bar publishes", () => {
  const box = (top: number, height: number) =>
    ({ top, bottom: top + height, height, left: 0, right: 0, width: 0, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;
  function bar(position: string, bottom: string, rect: DOMRect) {
    const el = document.createElement("div");
    el.style.position = position;
    el.style.bottom = bottom;
    el.getBoundingClientRect = () => rect;
    document.body.appendChild(el);
    return el;
  }

  it("is the bar's height while it is pinned at the foot (phone: over the tab bar; desktop: the window's foot)", () => {
    expect(footClearance(bar("sticky", "74px", box(844 - 74 - 67, 67)), 844)).toBe(67);
    expect(footClearance(bar("sticky", "0px", box(900 - 61, 61)), 900)).toBe(61);
    expect(footClearance(bar("fixed", "74px", box(844 - 74 - 120, 120)), 844)).toBe(120);
  });

  it("follows a sticky bar the page's end has carried up, so the toast still clears it", () => {
    expect(footClearance(bar("sticky", "74px", box(844 - 74 - 67 - 90, 67)), 844)).toBe(157);
  });

  it("is 0 for a bar in flow, hidden, or off screen", () => {
    expect(footClearance(bar("static", "", box(900 - 61, 61)), 900)).toBe(0);
    expect(footClearance(bar("sticky", "74px", box(0, 0)), 844)).toBe(0);
    expect(footClearance(bar("sticky", "74px", box(-200, 67)), 844)).toBe(0);
  });

  it("publishes the highest of every bar on the root, and clears it when the last goes (no dock: the shipped slot)", () => {
    const vh = window.innerHeight;
    const dock = bar("sticky", "74px", box(0, 0)); // the dock, hidden while the top-off bar stands in for it
    const topOff = bar("fixed", "74px", box(vh - 74 - 120, 120));
    function Foot({ el }: { el: HTMLElement }) {
      useDeckFootClearance(el);
      return null;
    }
    const a = render(<Foot el={dock} />);
    const b = render(<Foot el={topOff} />);
    expect(document.documentElement.style.getPropertyValue(DECK_FOOT_VAR)).toBe("120px");
    b.unmount();
    expect(document.documentElement.style.getPropertyValue(DECK_FOOT_VAR)).toBe("0px");
    a.unmount();
    expect(document.documentElement.style.getPropertyValue(DECK_FOOT_VAR)).toBe("");
  });
});
