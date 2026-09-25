import { fireEvent, renderHook, waitFor } from "@testing-library/react";
import { StrictMode, useRef } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { useBackDismiss, useDialogA11y } from "./dialog";

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

// A dialog opened from a control that the SAME commit marks `inert`.
describe("useDialogA11y return focus", () => {
  function mountWith(returnFocusRef?: { current: HTMLElement | null }) {
    const root = document.createElement("div");
    root.setAttribute("role", "dialog");
    document.body.appendChild(root);
    appended.push(root);
    return renderHook(() => {
      const ref = useRef<HTMLElement | null>(root);
      useDialogA11y(ref, vi.fn(), { returnFocusRef: returnFocusRef as never });
    });
  }

  it("returns focus to what was active when nothing else is named", () => {
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    appended.push(opener);
    opener.focus();

    mountWith().unmount();

    expect(document.activeElement).toBe(opener);
  });

  it("prefers the named target over its own capture", () => {
    // The capture runs in the dialog's mount effect, which is AFTER the commit
    // that rendered it — so a dialog opened from a control the same commit
    // marks `inert` records `body` instead, and closing drops the reader at the
    // top of the document. `/collection`'s set panel is exactly that shape:
    // pressing the Set row opens the panel and makes the sheet around the row
    // inert in one render. jsdom implements no `inert`, so the condition is
    // reproduced here by focusing something else entirely.
    const captured = document.createElement("button");
    const wanted = document.createElement("button");
    for (const el of [captured, wanted]) {
      document.body.appendChild(el);
      appended.push(el);
    }
    captured.focus();

    mountWith({ current: wanted }).unmount();

    expect(document.activeElement).toBe(wanted);
    expect(document.activeElement).not.toBe(captured);
  });

  it("falls back to the capture when the named target went away", () => {
    // A return target can unmount with the surface that opened it. Focusing
    // nothing would leave the reader at the top of the document, which is the
    // state this whole mechanism exists to prevent.
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    appended.push(opener);
    opener.focus();

    mountWith({ current: null }).unmount();

    expect(document.activeElement).toBe(opener);
  });
});

// #155. jsdom keeps a real session history — pushState, back() and an async
// popstate — so these run against the same mechanism a browser uses. Each case
// waits for history to settle before the next, because back() is queued, not
// immediate, and a leftover pop would be read by the following case.
describe("useBackDismiss", () => {
  const settle = () => new Promise((r) => setTimeout(r, 20));
  // The cases above unmount dialogs without waiting for them. Each one's self-pop is
  // a back() jsdom may answer with nothing, and the count it leaves expires after a
  // second — which is the rule, so it is waited out rather than reset.
  beforeAll(() => new Promise((r) => setTimeout(r, 1_100)));
  // Every dialog a case opens is unmounted HERE, and its self-pop allowed to land,
  // before the next case starts. A dialog still up at the end of a case holds an
  // entry, and the back() its unmount issues would otherwise be counted by the
  // next case's spy.
  const mounted: { unmount: () => void }[] = [];
  afterEach(async () => {
    while (mounted.length) mounted.pop()?.unmount();
    await new Promise((r) => setTimeout(r, 60));
    window.history.replaceState(null, "", "/");
  });
  const track = <T extends { unmount: () => void }>(hook: T): T => {
    let done = false;
    const unmount = hook.unmount;
    hook.unmount = () => {
      if (done) return;
      done = true;
      unmount();
    };
    mounted.push(hook);
    return hook;
  };

  function open(onClose = vi.fn(), canClose?: () => boolean) {
    const hook = track(renderHook(
      ({ isOpen }: { isOpen: boolean }) => useBackDismiss(isOpen, onClose, canClose),
      { initialProps: { isOpen: true } },
    ));
    return { onClose, hook };
  }

  // Counted as calls, never as history.length: a push truncates whatever forward
  // entries an earlier case left, so the length can stay put or even fall.
  it("puts one entry under an open dialog, and Back closes the dialog rather than leaving", async () => {
    const push = vi.spyOn(window.history, "pushState");
    const { onClose } = open();
    expect(push).toHaveBeenCalledTimes(1);
    push.mockRestore();
    window.history.back();
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("takes its own entry back off when the dialog closes some other way", async () => {
    const start = window.history.length;
    const { onClose, hook } = open();
    const back = vi.spyOn(window.history, "back");
    hook.unmount();
    await settle();
    // The half that fails without the self-pop: nothing else here can tell a
    // removed entry from a stranded one, because both land on the same path.
    expect(back).toHaveBeenCalledTimes(1);
    back.mockRestore();
    // Back again now has nothing of ours to step over: the next pop is the
    // reader's own navigation, and it closes nothing.
    expect(onClose).not.toHaveBeenCalled();
    const spy = vi.fn();
    window.addEventListener("popstate", spy);
    window.history.pushState(null, "", "/next");
    window.history.back();
    await waitFor(() => expect(spy).toHaveBeenCalled());
    window.removeEventListener("popstate", spy);
    expect(window.location.pathname).toBe("/");
    expect(window.history.length).toBeGreaterThanOrEqual(start);
  });

  it("closes only the top dialog on each Back", async () => {
    const under = open();
    const over = open();
    window.history.back();
    await waitFor(() => expect(over.onClose).toHaveBeenCalledTimes(1));
    expect(under.onClose).not.toHaveBeenCalled();
    // The top dialog re-armed after its rung, so closing it takes that entry off by a
    // self-pop, which lands before the reader's next press.
    over.hook.unmount();
    await settle();
    window.history.back();
    await waitFor(() => expect(under.onClose).toHaveBeenCalledTimes(1));
  });

  // Two presses, because one proves nothing: the entry before the dialog's is at
  // the same URL. Without the entry going back on, the second press would leave.
  it("keeps the dialog, and its entry, while it refuses to close", async () => {
    window.history.pushState(null, "", "/route");
    const { onClose } = open(vi.fn(), () => false);
    window.history.back();
    await settle();
    window.history.back();
    await settle();
    expect(onClose).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe("/route");
  });

  it("does not step back over a navigation the dialog made", async () => {
    const { hook } = open();
    window.history.pushState(null, "", "/elsewhere");
    hook.unmount();
    await settle();
    expect(window.location.pathname).toBe("/elsewhere");
  });

  it("keeps a URL the dialog wrote while open", async () => {
    const { hook } = open();
    window.history.replaceState(null, "", "/?set=abc");
    hook.unmount();
    await settle();
    expect(window.location.pathname + window.location.search).toBe("/?set=abc");
  });

  it("keeps a URL the dialog wrote while open when Back closes it", async () => {
    // jsdom has no Navigation API, so this is the fallback: the URL the pop lands
    // on is the predecessor's. Only a back() this module issues knows what it
    // left, which is the case above; this one records what the fallback costs.
    const { onClose } = open();
    window.history.replaceState(null, "", "/?set=abc");
    window.history.back();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(window.location.search).toBe("");
  });

  // The card modal's Escape closes the zoom, then the printing region, then the
  // dialog. Back does the same, so a dialog still up after its close is given a
  // fresh entry, or the next Back would leave the route with it open.
  it("steps down one rung per Back, like Escape", async () => {
    const onClose = vi.fn();
    track(renderHook(() => useBackDismiss(true, onClose)));
    const push = vi.spyOn(window.history, "pushState");
    window.history.back();
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1), { timeout: 1_000 });
    window.history.back();
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(2));
    push.mockRestore();
  });

  it("takes its entry off on a later close after refusing a Back", async () => {
    let refusing = true;
    const hook = track(renderHook(() => useBackDismiss(true, vi.fn(), () => !refusing)));
    window.history.back();
    await settle();
    refusing = false;
    const back = vi.spyOn(window.history, "back");
    hook.unmount();
    await settle();
    expect(back).toHaveBeenCalledTimes(1);
    back.mockRestore();
  });

  it("pushes once under StrictMode's remount, and steps back not at all", async () => {
    const push = vi.spyOn(window.history, "pushState");
    const back = vi.spyOn(window.history, "back");
    const hook = track(renderHook(() => useBackDismiss(true, vi.fn()), { wrapper: StrictMode }));
    await settle();
    expect(push).toHaveBeenCalledTimes(1);
    expect(back).not.toHaveBeenCalled();
    push.mockRestore();
    back.mockRestore();
    hook.unmount();
  });
});
