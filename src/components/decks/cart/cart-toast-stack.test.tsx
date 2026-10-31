// @vitest-environment jsdom
// Small items 7, item 3 (`Cart-Toasts`): on the phone a failed ask joins the cart's receipt in one stack, the receipt on
// the floor and the alert 10px above it; from md, and with no receipt open, the toasts keep their shipped slots.
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastFrame, TOAST_MS } from "../../collection/edit-toast";
import { SocialToast } from "../../social/social-toast";
import { CART_STACK_CLASS, CartToastStackHost, cartToastStack } from "./cart-toast-stack";
import { COVERED_WITH_MAIN } from "../../shell/covered-layer";

function wide(on: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: on && query.includes("768"), media: query, addEventListener: () => {}, removeEventListener: () => {},
  }));
}
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.querySelectorAll("[data-cart-toast-stack]").forEach((el) => el.remove());
});

function Receipt() {
  return <ToastFrame frameRef={{ current: null }} placement="cart" kind="receipt" title="Sol Ring added · ×1" />;
}
const failed = { id: 1, text: "We couldn’t send that." };

describe("the stack", () => {
  it("stands on the tab bar's floor + 10 with 16px gutters and a 10px gap, hidden from md", () => {
    expect(CART_STACK_CLASS).toContain("bottom-[calc(var(--tabbar-h,0px)+10px)]");
    expect(CART_STACK_CLASS).toContain("left-[16px] right-[16px] z-[60]");
    expect(CART_STACK_CLASS).toContain("flex flex-col gap-[10px]");
    expect(CART_STACK_CLASS).toContain("md:hidden");
  });

  it("is covered with main, in the shell's host and in the one a bare tree makes", () => {
    const made = cartToastStack();
    expect(made.hasAttribute(COVERED_WITH_MAIN)).toBe(true);
    made.remove();
    render(<div data-testid="shell"><CartToastStackHost /></div>);
    const host = cartToastStack();
    expect(host.parentElement).toBe(screen.getByTestId("shell"));
    expect(host.hasAttribute(COVERED_WITH_MAIN)).toBe(true);
  });
});

describe("on a phone", () => {
  it("draws the receipt on the floor (order-2) and the failed ask above it (order-1), both in the stack", () => {
    wide(false);
    render(<><Receipt /><SocialToast toast={failed} onDone={() => {}} placement="cart" /></>);
    const stack = cartToastStack();
    const [alert, receipt] = [screen.getByRole("alert"), document.querySelector<HTMLElement>("[data-toast-kind=receipt]")!];
    expect(stack.contains(alert) && stack.contains(receipt)).toBe(true);
    expect(alert.className).toContain("order-1");
    expect(receipt.className).toContain("order-2");
    expect(alert.className).not.toContain("fixed");
  });

  it("drops the failed ask to its centre slot at once when the receipt closes, and the receipt stays when the alert goes", () => {
    wide(false);
    const { rerender } = render(<><Receipt /><SocialToast toast={failed} onDone={() => {}} placement="cart" /></>);
    rerender(<SocialToast toast={failed} onDone={() => {}} placement="center" />);
    const alert = screen.getByRole("alert");
    expect(alert.closest("[data-cart-toast-stack]")).toBeNull();
    expect(alert.className).toContain("bottom-[calc(var(--tabbar-h,0px)+16px)]");
    rerender(<><Receipt /><SocialToast toast={null} onDone={() => {}} placement="cart" /></>);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(cartToastStack().querySelector("[data-toast-kind=receipt]")).not.toBeNull();
  });

  it("a newer failed ask replaces the older: one alert", () => {
    wide(false);
    const { rerender } = render(<SocialToast toast={failed} onDone={() => {}} placement="cart" />);
    rerender(<SocialToast toast={{ id: 2, text: "Again." }} onDone={() => {}} placement="cart" />);
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.getByRole("alert").textContent).toContain("Again.");
  });

  it("keeps its own clock across the move", () => {
    vi.useFakeTimers();
    try {
      wide(false);
      const onDone = vi.fn();
      const { rerender } = render(<SocialToast toast={failed} onDone={onDone} placement="cart" />);
      act(() => { vi.advanceTimersByTime(3000); });
      rerender(<SocialToast toast={failed} onDone={onDone} placement="center" />);
      expect(onDone).not.toHaveBeenCalled();
      // 3000ms were spent before the move: a clock that kept running fires at TOAST_MS in all, a reset one 3000ms later.
      act(() => { vi.advanceTimersByTime(TOAST_MS - 3000 - 250); });
      expect(onDone).not.toHaveBeenCalled();
      act(() => { vi.advanceTimersByTime(250); });
      expect(onDone).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("from md", () => {
  it("pins the shipped class strings: both toasts keep their own slots, nothing in the stack", () => {
    wide(true);
    render(<><Receipt /><SocialToast toast={failed} onDone={() => {}} placement="cart" /></>);
    expect(document.querySelector("[data-cart-toast-stack] *")).toBeNull();
    expect(document.querySelector<HTMLElement>("[data-toast-kind=receipt]")!.className).toContain("fixed bottom-[22px] right-[22px]");
    expect(screen.getByRole("alert").className).toContain("md:bottom-[24px]");
  });
});
