import { fireEvent, renderHook } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDialogA11y } from "./dialog";

// The trap roots below are appended by hand rather than rendered, so Testing
// Library's automatic cleanup does not know about them.
const appended: HTMLElement[] = [];

afterEach(() => {
  document.body.style.overflow = "";
  while (appended.length) appended.pop()?.remove();
});

// Scroll locking only. The hook takes a ref, so the harness supplies an empty
// one — nothing is attached, which leaves the focus trap inert and keeps these
// cases isolated to the lock.
function renderDialog(options?: Parameters<typeof useDialogA11y>[2]) {
  return renderHook(
    ({ opts }: { opts?: Parameters<typeof useDialogA11y>[2] }) => {
      const ref = useRef<HTMLDivElement | null>(null);
      useDialogA11y(ref, vi.fn(), opts);
      return ref;
    },
    { initialProps: { opts: options } },
  );
}

// Escape is wired to a window listener but no-ops unless the ref holds an
// element, so these cases attach a real one.
describe("useDialogA11y closeOnEscape", () => {
  function renderWithElement(options?: Parameters<typeof useDialogA11y>[2]) {
    const onClose = vi.fn();
    const el = document.createElement("div");
    document.body.appendChild(el);
    appended.push(el);
    renderHook(() => {
      const ref = useRef<HTMLElement | null>(el);
      useDialogA11y(ref, onClose, options);
    });
    return { onClose };
  }

  function pressEscape() {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  }

  it("closes on Escape by default", () => {
    const { onClose } = renderWithElement();
    pressEscape();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ignores Escape when closeOnEscape is false", () => {
    const { onClose } = renderWithElement({ closeOnEscape: false });
    pressEscape();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("useDialogA11y scroll lock", () => {
  it("locks body scroll by default", () => {
    renderDialog();
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("locks body scroll when asked", () => {
    renderDialog({ lockScroll: true });
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("leaves body scroll alone when a consumer opts out", () => {
    renderDialog({ lockScroll: false });
    expect(document.body.style.overflow).toBe("");
  });

  it("restores the previous overflow on unmount", () => {
    document.body.style.overflow = "scroll";
    const { unmount } = renderDialog({ lockScroll: true });
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("scroll");
  });

  // lockScroll is a plain option, so a caller may flip it on a mounted dialog
  // rather than unmounting. The lock has to follow the flag either way.
  it("releases the lock when the flag goes false without unmounting", () => {
    const { rerender } = renderDialog({ lockScroll: true });
    expect(document.body.style.overflow).toBe("hidden");
    rerender({ opts: { lockScroll: false } });
    expect(document.body.style.overflow).toBe("");
    rerender({ opts: { lockScroll: true } });
    expect(document.body.style.overflow).toBe("hidden");
  });

  // The deck builder's add sheet and export dialog are independent flags, so
  // both can be up at once and either may close first.
  it("holds the lock until the last of two dialogs releases it", () => {
    document.body.style.overflow = "scroll";
    const first = renderDialog({ lockScroll: true });
    const second = renderDialog({ lockScroll: true });
    expect(document.body.style.overflow).toBe("hidden");

    first.unmount();
    expect(document.body.style.overflow).toBe("hidden");

    second.unmount();
    expect(document.body.style.overflow).toBe("scroll");
  });
});

// A dialog that covers part of itself — the card modal's zoom is the first — leaves
// the covered controls mounted for layout and marks them `inert`. The browser will
// not focus them; `querySelectorAll` still finds them, so the trap has to.
describe("useDialogA11y and inert subtrees", () => {
  function renderTrap(markInert: boolean) {
    const el = document.createElement("div");
    el.innerHTML = `
      <div ${markInert ? "inert" : ""}><button id="covered">covered</button></div>
      <div><button id="live">live</button></div>
    `;
    document.body.appendChild(el);
    appended.push(el);
    // jsdom gives every element a zero rect, which the trap reads as "not visible";
    // the real filter under test is the inert one, so rects are stubbed present.
    for (const node of el.querySelectorAll("button")) {
      node.getClientRects = () => [{ width: 10, height: 10 }] as unknown as DOMRectList;
    }
    renderHook(() => {
      const ref = useRef<HTMLElement | null>(el);
      useDialogA11y(ref, vi.fn());
    });
    return el;
  }

  function tabFrom(el: HTMLElement, id: string, shift = false) {
    (el.querySelector(`#${id}`) as HTMLElement).focus();
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: shift, bubbles: true }));
  }

  it("wraps Tab past an inert control rather than onto it", () => {
    const el = renderTrap(true);

    tabFrom(el, "live");

    // Only the live control is in the cycle, so Tab from it wraps back to itself
    // rather than landing on a control the browser refuses to focus.
    expect(document.activeElement?.id).toBe("live");
  });

  it("still cycles through a control that is not inert", () => {
    const el = renderTrap(false);

    tabFrom(el, "live");

    expect(document.activeElement?.id).toBe("covered");
  });

  // The root carries `tabIndex={-1}` so it is excluded from the focusable list —
  // it is neither `first` nor `last`, so both wrap branches missed and the first
  // Shift+Tab after opening left an `aria-modal` surface for the page behind it.
  // `/collection`'s filter sheet and the deck sheet both take initial focus this
  // way, to avoid raising the phone keyboard.
  function renderRootFocused() {
    const el = document.createElement("div");
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.tabIndex = -1;
    el.innerHTML = `<button id="first">first</button><button id="last">last</button>`;
    document.body.appendChild(el);
    appended.push(el);
    // jsdom gives every element a zero rect, which the trap reads as "not visible".
    for (const node of el.querySelectorAll("button")) {
      node.getClientRects = () => [{ width: 10, height: 10 }] as unknown as DOMRectList;
    }
    renderHook(() => {
      const ref = useRef<HTMLElement | null>(el);
      useDialogA11y(ref, vi.fn(), { initialFocusRef: ref });
    });
    return el;
  }

  it("wraps Shift+Tab to the last control when the root holds focus", () => {
    const el = renderRootFocused();
    expect(document.activeElement).toBe(el);
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(el.querySelector("#last"));
  });

  it("enters at the first control when the root holds focus and Tab goes forward", () => {
    const el = renderRootFocused();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(document.activeElement).toBe(el.querySelector("#first"));
  });


  it("leaves another dialog's Tab alone when two are mounted", () => {
    // The listener is on `window`, so every mounted hook sees every Tab, and
    // the hook explicitly supports two dialogs at once. Focus inside a sibling
    // modal reads as "not in this trap", so the background dialog would pull
    // focus into itself the moment the foreground one was Tabbed.
    const background = renderRootFocused();
    const foreground = document.createElement("div");
    foreground.setAttribute("role", "dialog");
    foreground.setAttribute("aria-modal", "true");
    foreground.innerHTML = `<button id="fg">fg</button>`;
    document.body.appendChild(foreground);
    appended.push(foreground);
    const fg = foreground.querySelector<HTMLElement>("#fg")!;
    fg.getClientRects = () => [{ width: 10, height: 10 }] as unknown as DOMRectList;
    fg.focus();

    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });

    expect(document.activeElement).toBe(fg);
    expect(background.contains(document.activeElement)).toBe(false);
  });


  it("does not close a background dialog on the foreground's Escape", () => {
    // The guard has to cover Escape as much as Tab: every mounted hook sees the
    // key, so an Escape meant for the dialog in front closed the one behind it.
    const onClose = vi.fn();
    const background = document.createElement("div");
    background.setAttribute("role", "dialog");
    document.body.appendChild(background);
    appended.push(background);
    renderHook(() => {
      const ref = useRef<HTMLElement | null>(background);
      useDialogA11y(ref, onClose);
    });

    const foreground = document.createElement("div");
    foreground.setAttribute("role", "dialog");
    foreground.innerHTML = `<button id="fg">fg</button>`;
    document.body.appendChild(foreground);
    appended.push(foreground);
    foreground.querySelector<HTMLElement>("#fg")!.focus();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

});
